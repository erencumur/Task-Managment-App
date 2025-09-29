using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Data;
using TaskBoard.Api.Models;

namespace TaskBoard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ProjectsController(AppDbContext db) => _db = db;

        // GET /api/projects
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var data = await _db.Projects
                .OrderByDescending(p => p.Id)
                .Select(p => new { p.Id, p.Name, p.CreatedAt })
                .ToListAsync();

            return Ok(data);
        }

        // POST /api/projects
        // Body: { "name": "Proje Adı" }
        public record CreateProjectReq(string name);

        [HttpPost]
        public async Task<ActionResult<object>> Create([FromBody] CreateProjectReq req)
        {
            if (string.IsNullOrWhiteSpace(req.name))
                return BadRequest("Name is required.");

            var p = new Project { Name = req.name };
            _db.Projects.Add(p);
            await _db.SaveChangesAsync();

            // Varsayılan 3 listeyi ekle
            var lists = new[]
            {
                new ListEntity { Name = "Yapılacak",    ProjectId = p.Id, Order = 0 },
                new ListEntity { Name = "Devam Ediyor", ProjectId = p.Id, Order = 1 },
                new ListEntity { Name = "Tamamlandı",   ProjectId = p.Id, Order = 2 },
            };
            _db.Lists.AddRange(lists);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = p.Id }, new { p.Id, p.Name, p.CreatedAt });
        }

        // DELETE /api/projects/{id}
  
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
           
            var project = await _db.Projects
                .Include(p => p.Lists)
                    .ThenInclude(l => l.Tasks)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
                return NotFound();

            
            if (project.Lists != null && project.Lists.Count > 0)
            {
                foreach (var list in project.Lists)
                {
                    if (list.Tasks != null && list.Tasks.Count > 0)
                        _db.Tasks.RemoveRange(list.Tasks);
                }
                _db.Lists.RemoveRange(project.Lists);
            }

            _db.Projects.Remove(project);
            await _db.SaveChangesAsync();
            return NoContent(); 
        }

        
        [HttpDelete]
        public Task<IActionResult> DeleteByQuery([FromQuery] int id) => Delete(id);

        // PUT /api/projects/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Project dto)
        {
            var p = await _db.Projects.FindAsync(id);
            if (p == null) return NotFound();
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
            p.Name = dto.Name;
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
