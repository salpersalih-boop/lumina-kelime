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
        // SQL Server bağlantı cümlemiz (Senin bilgisayarındaki veritabanına bağlanır)
        private readonly string connectionString = "Server=.;Database=LuminaDB;Trusted_Connection=True;TrustServerCertificate=True;";

        [HttpGet]
        public IActionResult GetWords()
        {
            var wordsList = new List<object>();

            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();
                string query = "SELECT OriginalWord, TranslatedWord FROM Words WHERE LanguageId = 1";

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            wordsList.Add(new
                            {
                                original = reader["OriginalWord"].ToString(),
                                translated = reader["TranslatedWord"].ToString()
                            });
                        }
                    }
                }
            }

            return Ok(wordsList);
        }
    }
}