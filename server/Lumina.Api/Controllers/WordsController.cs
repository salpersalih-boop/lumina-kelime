using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Lumina.Api.Controllers
{
    /// <summary>
    /// Kelime listelerini SQL Server'dan döndürür. Tüm diller tek bir kod yolundan geçer;
    /// yeni dil eklemek için <see cref="Languages"/> sözlüğüne bir satır eklemek yeterlidir.
    /// </summary>
    [EnableCors("AllowAll")]
    [Route("api/[controller]")]
    [ApiController]
    public class WordsController : ControllerBase
    {
        private const int GroupSize = 100;

        /// <param name="Sql">Sırası belli (ORDER BY) iki sütun döndüren sorgu: önce hedef dil kelimesi, sonra Türkçe anlam.</param>
        private sealed record LanguageSource(string Sql, int? LanguageId = null);

        private static readonly Dictionary<string, LanguageSource> Languages = new(StringComparer.OrdinalIgnoreCase)
        {
            // Modern şema: dbo.Words(Id, LanguageId, OriginalWord, TranslatedWord) — bkz. Database/schema.sql
            ["english"]   = new("SELECT OriginalWord, TranslatedWord FROM dbo.Words WHERE LanguageId = @lang ORDER BY Id", 1),

            // Excel'den içe aktarılan tablolar — bkz. Database/import_words.sql (RowId = dosyadaki sıra)
            ["german"]    = new("SELECT [Almanca Kelime], [Türkçe Anlamı] FROM dbo.[Almanca] ORDER BY RowId"),
            ["french"]    = new("SELECT [Fransızca Kelime], [Türkçe Anlamı] FROM dbo.[Fransızca] ORDER BY RowId"),
            ["swedish"]   = new("SELECT [İsveççe Anlamı], [Türkçe Anlamı] FROM dbo.[Isvecce] ORDER BY RowId"),
            ["spanish"]   = new("SELECT [İspanyolca Kelime], [Türkçe Anlamı] FROM dbo.[Ispanyolca] ORDER BY RowId"),
            ["norwegian"] = new("SELECT [Norveççe Kelime], [Türkçe Anlamı] FROM dbo.[Norvecce] ORDER BY RowId"),
        };

        private readonly string _connectionString;
        private readonly ILogger<WordsController> _logger;

        public WordsController(IConfiguration configuration, ILogger<WordsController> logger)
        {
            _connectionString = configuration.GetConnectionString("Lumina")
                ?? throw new InvalidOperationException("ConnectionStrings:Lumina ayarı eksik (appsettings.json).");
            _logger = logger;
        }

        // GET /api/words  (İngilizce)
        [HttpGet]
        public Task<IActionResult> GetEnglish() => GetWordsAsync("english");

        // GET /api/words/count
        [HttpGet("count")]
        public Task<IActionResult> GetEnglishCount() => GetCountAsync("english");

        // GET /api/words/{english|german|french|swedish|spanish|norwegian}
        [HttpGet("{lang}")]
        public Task<IActionResult> GetByLanguage(string lang) => GetWordsAsync(lang);

        // GET /api/words/{lang}/count
        [HttpGet("{lang}/count")]
        public Task<IActionResult> GetCountByLanguage(string lang) => GetCountAsync(lang);

        private async Task<IActionResult> GetWordsAsync(string lang)
        {
            if (!Languages.TryGetValue(lang, out var source))
                return NotFound(new { error = $"Bilinmeyen dil: {lang}" });

            try
            {
                var rows = new List<(string Word, string Turkish)>();

                await using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();
                await using var command = new SqlCommand(source.Sql, connection);
                if (source.LanguageId.HasValue) command.Parameters.AddWithValue("@lang", source.LanguageId.Value);

                await using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var word = Read(reader, 0);
                    var turkish = Read(reader, 1);
                    // Çevirisi henüz girilmemiş satırlar listeye alınmaz
                    if (word.Length == 0 || turkish.Length == 0) continue;
                    rows.Add((word, turkish));
                }

                // Sıra SQL'deki ORDER BY ile sabittir; grup = her 100 kelime
                var result = rows
                    .Select((r, i) => new
                    {
                        id = i + 1,
                        groupId = i / GroupSize + 1,
                        english = r.Word,
                        turkish = r.Turkish
                    })
                    .ToList();

                Response.Headers.CacheControl = "public, max-age=3600";
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{Lang} kelimeleri okunamadı", lang);
                return StatusCode(500, new { error = "Kelimeler yüklenemedi." });
            }
        }

        private async Task<IActionResult> GetCountAsync(string lang)
        {
            // Sayı, listeyle birebir aynı filtreyle hesaplanır (boş satırlar sayılmaz).
            var response = await GetWordsAsync(lang);
            if (response is OkObjectResult ok && ok.Value is System.Collections.ICollection items)
                return Ok(new { count = items.Count });
            return response;
        }

        private static string Read(SqlDataReader reader, int ordinal) =>
            reader.IsDBNull(ordinal) ? "" : (reader.GetValue(ordinal)?.ToString() ?? "").Trim();
    }
}
