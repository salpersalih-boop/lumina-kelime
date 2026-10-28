using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Lumina.Api.Controllers
{
    [EnableCors("AllowAll")]
    [Route("api/[controller]")]
    [ApiController]
    public class VerbsLabController : ControllerBase
    {
        // GET /api/VerbsLab
        [HttpGet]
        public IActionResult GetVerbsLab()
        {
            // Şimdilik boş liste döndür – 404 hatasını giderir
            return Ok(new List<object>());
        }
    }
}
