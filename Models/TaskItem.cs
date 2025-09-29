using System;

namespace TaskBoard.Api.Models
{
    public class TaskItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTime? DueDate { get; set; }
        public int Order { get; set; }   

        public int ListEntityId { get; set; }
        public ListEntity List { get; set; } = null!;
    }
}