using System;
using System.Collections.Generic;

namespace TaskBoard.Api.Models
{
    public class Project
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<ListEntity> Lists { get; set; } = new();
    }
}