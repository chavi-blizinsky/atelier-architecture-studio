using System.Text.Json;
using Atelier.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Atelier.Infrastructure;

public class AtelierDbContext(DbContextOptions<AtelierDbContext> options) : DbContext(options)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Material> Materials => Set<Material>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Project>().HasOne(p => p.Plan).WithOne().HasForeignKey<Plan>(p => p.ProjectId);
        b.Entity<Project>().Property(p => p.Budget).HasPrecision(12, 2);
        b.Entity<Project>().Property(p => p.Fee).HasPrecision(12, 2);
        b.Entity<Project>().Property(p => p.Paid).HasPrecision(12, 2);
        b.Entity<Material>().Property(m => m.Price).HasPrecision(10, 2);

        // The drawing is a document (walls/rooms/openings/furniture) – persisted as JSON, compared by value.
        b.Entity<Plan>().Property(p => p.Geometry)
            .HasConversion(
                g => JsonSerializer.Serialize(g, Json),
                s => JsonSerializer.Deserialize<PlanGeometry>(s, Json)!,
                new ValueComparer<PlanGeometry>(
                    (a, c) => JsonSerializer.Serialize(a, Json) == JsonSerializer.Serialize(c, Json),
                    g => JsonSerializer.Serialize(g, Json).GetHashCode(),
                    g => JsonSerializer.Deserialize<PlanGeometry>(JsonSerializer.Serialize(g, Json), Json)!));
    }
}
