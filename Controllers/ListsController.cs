using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Data;

namespace TaskBoard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ListsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ListsController(AppDbContext db) => _db = db;

        // GET /api/lists?projectId=1
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> Get([FromQuery] int projectId)
        {
            if (projectId <= 0)
                return BadRequest("projectId is required.");

            var exists = await _db.Projects.AnyAsync(p => p.Id == projectId);
            if (!exists) return NotFound("Project not found.");

            var lists = await _db.Lists
                .Where(l => l.ProjectId == projectId)
                .OrderBy(l => l.Order)
                .Select(l => new
                {
                    l.Id,
                    l.Name,
                    l.Order,
                    Tasks = l.Tasks
                        .OrderBy(t => t.Order)
                        .Select(t => new
                        {
                            t.Id,
                            t.Title,
                            t.Description,
                            t.DueDate,
                            t.Order,
                            t.ListEntityId
                        })
                })
                .ToListAsync();

            return Ok(lists);
        }
    }
}
