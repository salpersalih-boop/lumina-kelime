using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Lumina.Api.Controllers
{
    [EnableCors("AllowAll")]
    [Route("api/[controller]")]
    [ApiController]
    public class WordsController : ControllerBase
    {
        private readonly string connectionString = "Server=.;Database=LuminaDB;Trusted_Connection=True;TrustServerCertificate=True;";

        // ── İngilizce: GET /api/words ──
        // Words tablosundan LanguageId=1 olanları çeker, groupId de döndürür
        [HttpGet]
        public IActionResult GetWords()
        {
            var wordsList = new List<object>();

            try
            {
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    // ROW_NUMBER ile sıra no üretiyoruz, Id sütunu olmasa bile çalışır
                    string query = @"SELECT 
                        ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS RowNum,
                        OriginalWord, TranslatedWord 
                        FROM Words WHERE LanguageId = 1";

                    using (SqlCommand command = new SqlCommand(query, connection))
                    {
                        using (SqlDataReader reader = command.ExecuteReader())
                        {
                            int index = 0;
                            while (reader.Read())
                            {
                                index++;
                                wordsList.Add(new
                                {
                                    id = index,
                                    groupId = (int)Math.Ceiling((double)index / 100),
                                    english = reader["OriginalWord"]?.ToString()?.Trim() ?? "",
                                    turkish = reader["TranslatedWord"]?.ToString()?.Trim() ?? ""
                                });
                            }
                        }
                    }
                }

                return Ok(wordsList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "İngilizce kelimeler yüklenemedi.", detail = ex.Message });
            }
        }

        // ── İngilizce kelime sayısı: GET /api/words/count ──
        [HttpGet("count")]
        public IActionResult GetEnglishCount()
        {
            try
            {
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    string query = "SELECT COUNT(*) FROM Words WHERE LanguageId = 1";
                    using (SqlCommand command = new SqlCommand(query, connection))
                    {
                        int count = (int)command.ExecuteScalar();
                        return Ok(new { count });
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ── Almanca: GET /api/words/german ──
        [HttpGet("german")]
        public IActionResult GetGermanWords()
        {
            var wordsList = new List<object>();

            try
            {
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    // Almanca tablosu: Sıra | Kelime | Anlamı | Türkçe Anlamı
                    string query = "SELECT * FROM Almanca";

                    using (SqlCommand command = new SqlCommand(query, connection))
                    {
                        using (SqlDataReader reader = command.ExecuteReader())
                        {
                            int index = 0;
                            while (reader.Read())
                            {
                                index++;
                                var kelime = reader[1]?.ToString()?.Trim() ?? "";
                                var turkce = reader[3]?.ToString()?.Trim() ?? "";

                                if (!string.IsNullOrEmpty(kelime) && !string.IsNullOrEmpty(turkce))
                                {
                                    wordsList.Add(new
                                    {
                                        id = index,
                                        groupId = (int)Math.Ceiling((double)index / 100),
                                        english = kelime,
                                        turkish = turkce
                                    });
                                }
                            }
                        }
                    }
                }

                return Ok(wordsList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Almanca kelimeler yüklenemedi.", detail = ex.Message });
            }
        }

        // ── Almanca kelime sayısı: GET /api/words/german/count ──
        [HttpGet("german/count")]
        public IActionResult GetGermanCount()
        {
            try
            {
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    string query = "SELECT COUNT(*) FROM Almanca";
                    using (SqlCommand command = new SqlCommand(query, connection))
                    {
                        int count = (int)command.ExecuteScalar();
                        return Ok(new { count });
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ── Fransızca: GET /api/words/french ──
        [HttpGet("french")]
        public IActionResult GetFrenchWords()
        {
            var wordsList = new List<object>();

            try
            {
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    // Fransizca tablosu: Sıra | Kelime | Anlamı | Türkçe Anlamı
                    string query = "SELECT * FROM Fransizca";

                    using (SqlCommand command = new SqlCommand(query, connection))
                    {
                        using (SqlDataReader reader = command.ExecuteReader())
                        {
                            int index = 0;
                            while (reader.Read())
                            {
                                index++;
                                var kelime = reader[1]?.ToString()?.Trim() ?? "";
                                var turkce = reader[3]?.ToString()?.Trim() ?? "";

                                if (!string.IsNullOrEmpty(kelime) && !string.IsNullOrEmpty(turkce))
                                {
                                    wordsList.Add(new
                                    {
                                        id = index,
                                        groupId = (int)Math.Ceiling((double)index / 100),
                                        english = kelime,
                                        turkish = turkce
                                    });
                                }
                            }
                        }
                    }
                }

                return Ok(wordsList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Fransızca kelimeler yüklenemedi.", detail = ex.Message });
            }
        }

        // ── Fransızca kelime sayısı: GET /api/words/french/count ──
        [HttpGet("french/count")]
        public IActionResult GetFrenchCount()
        {
            try
            {
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    string query = "SELECT COUNT(*) FROM Fransizca";
                    using (SqlCommand command = new SqlCommand(query, connection))
                    {
                        int count = (int)command.ExecuteScalar();
                        return Ok(new { count });
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}