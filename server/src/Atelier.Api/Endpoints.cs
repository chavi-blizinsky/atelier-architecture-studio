using Atelier.Core;
using Atelier.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Api;

public record MoveStageRequest(Stage Stage);
public record ProposalRequest(string Brief);

public static class Endpoints
{
    public static void MapAtelierEndpoints(this IEndpointRouteBuilder app)
    {
        var projects = app.MapGroup("/api/projects").WithTags("Projects");

        projects.MapGet("/", async (AtelierDbContext db, Stage? stage) =>
            await db.Projects.Where(p => stage == null || p.Stage == stage)
                .Select(p => new { p.Id, p.Name, p.Type, p.City, p.AreaSqm, p.Budget, p.Stage, p.Fee, p.Paid, Client = p.Client.Name, OpenBalance = p.Fee - p.Paid })
                .ToListAsync())
            .WithSummary("Projects, optionally filtered by stage");

        projects.MapPut("/{id:int}/stage", async (int id, MoveStageRequest req, AtelierDbContext db) =>
        {
            var p = await db.Projects.FindAsync(id);
            if (p is null) return Results.NotFound();
            p.MoveTo(req.Stage); // throws DomainException → 409
            await db.SaveChangesAsync();
            return Results.Ok(new { p.Id, p.Stage });
        }).WithSummary("Move a project one stage forward/back (business rule enforced)");

        projects.MapPost("/{id:int}/proposal", async (int id, ProposalRequest req, AtelierDbContext db) =>
        {
            var p = await db.Projects.FindAsync(id);
            if (p is null) return Results.NotFound();
            if (string.IsNullOrWhiteSpace(req.Brief)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["brief"] = ["יש לתאר את הבקשה"] });
            return Results.Ok(ProposalAgent.Draft(p.Type, p.AreaSqm, req.Brief));
        }).WithSummary("Fee-proposal agent: scope detection + pricing + reasoning");

        var plans = app.MapGroup("/api/plans").WithTags("Plans");

        plans.MapGet("/{id:int}", async (int id, AtelierDbContext db) =>
            await db.Plans.FindAsync(id) is { } plan ? Results.Ok(plan) : Results.NotFound());

        plans.MapPut("/{id:int}", async (int id, PlanGeometry geometry, AtelierDbContext db) =>
        {
            var plan = await db.Plans.FindAsync(id);
            if (plan is null) return Results.NotFound();
            if (geometry.CeilingHeight is < 150 or > 600) return Results.ValidationProblem(new Dictionary<string, string[]> { ["ceilingHeight"] = ["גובה תקרה לא סביר"] });
            plan.Geometry = geometry;
            plan.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).WithSummary("Save the drawing (JSON document)");

        plans.MapGet("/{id:int}/quantities", async (int id, string? paint, AtelierDbContext db) =>
        {
            var plan = await db.Plans.FindAsync(id);
            if (plan is null) return Results.NotFound();
            var materials = await db.Materials.ToDictionaryAsync(m => m.Id);
            var lines = Quantities.Calculate(plan.Geometry, materials, paint ?? "m-paint-white");
            return Results.Ok(new { lines, total = lines.Sum(l => l.Total) });
        }).WithSummary("Bill of quantities computed from the drawing");

        plans.MapGet("/{id:int}/regulations", async (int id, AtelierDbContext db) =>
            await db.Plans.FindAsync(id) is { } plan ? Results.Ok(Regulations.Check(plan.Geometry)) : Results.NotFound())
            .WithSummary("Building-regulation checks");

        app.MapGet("/api/suppliers", async (AtelierDbContext db) =>
            await db.Suppliers.Select(s => new { s.Id, s.Name, s.Url, s.Note, Materials = db.Materials.Where(m => m.SupplierId == s.Id).Select(m => new { m.Id, m.Name, m.Price, m.Unit }).ToList() }).ToListAsync())
            .CacheOutput("catalog").WithTags("Catalog").WithSummary("Supplier catalogue (output-cached)");
    }
}
