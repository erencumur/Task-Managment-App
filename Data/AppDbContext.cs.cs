using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Models;

namespace TaskBoard.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Project> Projects => Set<Project>();
        public DbSet<ListEntity> Lists => Set<ListEntity>();
        public DbSet<TaskItem> Tasks => Set<TaskItem>();

        protected override void OnModelCreating(ModelBuilder mb)
        {
            // İlişkiler ve varsayılanlar
            mb.Entity<Project>()
              .HasMany(p => p.Lists)
              .WithOne(l => l.Project)
              .HasForeignKey(l => l.ProjectId)
              .OnDelete(DeleteBehavior.Cascade);

            mb.Entity<ListEntity>()
              .HasMany(l => l.Tasks)
              .WithOne(t => t.List)
              .HasForeignKey(t => t.ListEntityId)
              .OnDelete(DeleteBehavior.Cascade);

            mb.Entity<ListEntity>().Property(l => l.Order).HasDefaultValue(0);
            mb.Entity<TaskItem>().Property(t => t.Order).HasDefaultValue(0);
        }
    }
}