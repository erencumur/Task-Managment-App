using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Data;
using TaskBoard.Api.Models;

namespace TaskBoard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _db;
        public TasksController(AppDbContext db) => _db = db;

        // ---------- DTO'lar ----------
        public class CreateTaskReq
        {
            public int ListEntityId { get; set; }
            public string Title { get; set; } = null!;
            public string? Description { get; set; }
            public DateTime? DueDate { get; set; }
        }

        public class UpdateTaskReq
        {
            
            public string? Title { get; set; }
            public string? Description { get; set; }
            public DateTime? DueDate { get; set; }

            // Taşıma/sıralama için:
            public int? ListEntityId { get; set; }   // yeni liste id (verilirse oraya taşır)
            public int? Order { get; set; }          // listede kaçıncı sıraya (0,1,2..)
        }

        // ---------- POST /api/Tasks ----------
        [HttpPost]
        public async Task<ActionResult<object>> Create([FromBody] CreateTaskReq req)
        {
            // liste var mı?
            var list = await _db.Lists.Include(l => l.Tasks)
                                      .FirstOrDefaultAsync(l => l.Id == req.ListEntityId);
            if (list == null) return NotFound("List not found.");

            // mevcut listenin sonuna ekle
            var nextOrder = list.Tasks.Any() ? list.Tasks.Max(t => t.Order) + 1 : 0;

            var task = new TaskItem
            {
                Title = req.Title,
                Description = req.Description,
                DueDate = req.DueDate,
                ListEntityId = req.ListEntityId,
                Order = nextOrder
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = task.Id }, new
            {
                task.Id,
                task.Title,
                task.Description,
                task.DueDate,
                task.Order,
                task.ListEntityId
            });
        }

        // ---------- GET /api/Tasks/{id} (CreatedAtAction için basit getter) ----------
        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetById(int id)
        {
            var t = await _db.Tasks.FindAsync(id);
            if (t == null) return NotFound();
            return Ok(new
            {
                t.Id,
                t.Title,
                t.Description,
                t.DueDate,
                t.Order,
                t.ListEntityId
            });
        }

        // ---------- PUT /api/Tasks/{id} ----------
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskReq req)
        {
            var t = await _db.Tasks.FindAsync(id);
            if (t == null) return NotFound("Task not found.");

            if (req.Title != null) t.Title = req.Title;
            if (req.Description != null) t.Description = req.Description;
            if (req.DueDate.HasValue) t.DueDate = req.DueDate;

            // başka listeye taşıma veya listede sıralama
            if (req.ListEntityId.HasValue && req.ListEntityId.Value != t.ListEntityId)
            {
                // yeni liste var mı?
                var newList = await _db.Lists.Include(l => l.Tasks)
                                             .FirstOrDefaultAsync(l => l.Id == req.ListEntityId.Value);
                if (newList == null) return NotFound("Target list not found.");

                t.ListEntityId = newList.Id;
                // hedef listede istenen sıraya koy, yoksa sona
                if (req.Order.HasValue)
                    t.Order = Math.Max(0, req.Order.Value);
                else
                    t.Order = newList.Tasks.Any() ? newList.Tasks.Max(x => x.Order) + 1 : 0;
            }
            else if (req.Order.HasValue)
            {
                // aynı listede sırası güncelleniyor
                t.Order = Math.Max(0, req.Order.Value);
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---------- DELETE /api/Tasks/{id} ----------
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var t = await _db.Tasks.FindAsync(id);
            if (t == null) return NotFound();
            _db.Tasks.Remove(t);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
