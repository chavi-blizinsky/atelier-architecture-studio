namespace Atelier.Core;

// Domain model (Clean Architecture "Core" – no framework dependencies). Plan coordinates are centimetres.

public enum Stage { Lead, Concept, Design, Permit, Construction, Handover }
public enum ProjectType { Apartment, House, Office, Kids, Kitchen }
public enum RoomType { Living, Bedroom, Kitchen, Bath, Mamad, Balcony, Hall }
public enum OpeningKind { Door, Window }
public enum MaterialCategory { Paint, Tiles, Flooring, Board, Sanitary, Lighting, Kitchen, Skirting }

public record Pt(double X, double Y);
public record Wall(string Id, Pt A, Pt B, double Thickness);
public record Room(string Id, string Name, RoomType Type, IReadOnlyList<Pt> Points, string FloorMaterialId);
public record Opening(string Id, string WallId, double T, double Width, OpeningKind Kind);
public record Furniture(string Id, string Kind, double X, double Y, double W, double H, double Rot);
public record PlanGeometry(double CeilingHeight, IReadOnlyList<Wall> Walls, IReadOnlyList<Room> Rooms, IReadOnlyList<Opening> Openings, IReadOnlyList<Furniture> Furniture);

public class Client
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public string City { get; set; } = "";
    public List<Project> Projects { get; set; } = new();
}

public class Project
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public Client Client { get; set; } = null!;
    public string Name { get; set; } = "";
    public ProjectType Type { get; set; }
    public string City { get; set; } = "";
    public double AreaSqm { get; set; }
    public decimal Budget { get; set; }
    public Stage Stage { get; set; }
    public decimal Fee { get; set; }
    public decimal Paid { get; set; }
    public List<Milestone> Milestones { get; set; } = new();
    public Plan? Plan { get; set; }

    /// <summary>Business rule: a project can only move one stage at a time, forward or back.</summary>
    public void MoveTo(Stage next)
    {
        if (Math.Abs((int)next - (int)Stage) > 1)
            throw new DomainException($"אי אפשר לדלג משלב {Stage} לשלב {next}");
        Stage = next;
    }
}

public class Milestone
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = "";
    public DateOnly Start { get; set; }
    public DateOnly End { get; set; }
    public bool Done { get; set; }
}

public class Plan
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = "";
    /// <summary>Walls, rooms, openings and furniture – stored as a JSON document.</summary>
    public PlanGeometry Geometry { get; set; } = new(270, [], [], [], []);
    public DateTime UpdatedAt { get; set; }
}

public class Supplier
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string Note { get; set; } = "";
}

public class Material
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public MaterialCategory Category { get; set; }
    public string Unit { get; set; } = "";
    public decimal Price { get; set; }
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public double? Coverage { get; set; }
    public string? Hex { get; set; }
}

public class DomainException(string message) : Exception(message);
