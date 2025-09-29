using TaskBoard.Api.Models;

using System.Collections.Generic;




namespace TaskBoard.Api.Models
{
    // Projedeki sütunu temsil eder: Yapılacak / Devam Ediyor / Tamamlandı
    public class ListEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int Order { get; set; }   // Sütun sırası (0,1,2)

        // FK
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;
        public List<TaskItem> Tasks { get; set; } = new();


    }
}
