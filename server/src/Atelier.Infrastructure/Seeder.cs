using Atelier.Core;

namespace Atelier.Infrastructure;

/// <summary>Demo office – invented clients; suppliers point to their real public websites.</summary>
public static class Seeder
{
    public static PlanGeometry DemoPlan()
    {
        static Wall W(string id, double x1, double y1, double x2, double y2, double t = 20) => new(id, new(x1, y1), new(x2, y2), t);
        static Room R(string id, string name, RoomType type, string floor, params double[] xy) =>
            new(id, name, type, Enumerable.Range(0, xy.Length / 2).Select(i => new Pt(xy[i * 2], xy[i * 2 + 1])).ToList(), floor);
        return new PlanGeometry(270,
            [W("w1", 0, 0, 1200, 0, 25), W("w2", 1200, 0, 1200, 900, 25), W("w3", 1200, 900, 0, 900, 25), W("w4", 0, 900, 0, 0, 25),
             W("w5", 700, 0, 700, 520), W("w6", 700, 520, 1200, 520), W("w7", 950, 0, 950, 520), W("w8", 0, 560, 420, 560),
             W("w9", 420, 560, 420, 900), W("w10", 420, 720, 700, 720), W("w11", 700, 520, 700, 900)],
            [R("r1", "סלון ופינת אוכל", RoomType.Living, "m-porc-60", 0, 0, 700, 0, 700, 520, 700, 560, 420, 560, 0, 560),
             R("r2", "חדר הורים", RoomType.Bedroom, "m-parquet", 700, 0, 950, 0, 950, 520, 700, 520),
             R("r3", "חדר ילדים", RoomType.Bedroom, "m-parquet", 950, 0, 1200, 0, 1200, 520, 950, 520),
             R("r4", "ממ״ד", RoomType.Mamad, "m-porc-60", 700, 520, 1200, 520, 1200, 900, 700, 900),
             R("r5", "מטבח", RoomType.Kitchen, "m-porc-60", 0, 560, 420, 560, 420, 900, 0, 900),
             R("r6", "חדר רחצה", RoomType.Bath, "m-tile-bath", 420, 720, 700, 720, 700, 900, 420, 900),
             R("r7", "מבואה", RoomType.Hall, "m-porc-60", 420, 560, 700, 560, 700, 720, 420, 720)],
            [new("o1", "w1", 0.25, 240, OpeningKind.Window), new("o2", "w4", 0.7, 100, OpeningKind.Door), new("o3", "w1", 0.69, 140, OpeningKind.Window),
             new("o4", "w1", 0.9, 140, OpeningKind.Window), new("o5", "w2", 0.78, 100, OpeningKind.Window), new("o6", "w3", 0.82, 120, OpeningKind.Window),
             new("o7", "w5", 0.75, 80, OpeningKind.Door), new("o8", "w6", 0.7, 80, OpeningKind.Door), new("o9", "w6", 0.2, 80, OpeningKind.Door),
             new("o10", "w10", 0.5, 70, OpeningKind.Door), new("o11", "w8", 0.5, 90, OpeningKind.Door)],
            [new("f6", "kitchen", 20, 820, 380, 60, 0)]);
    }

    public static void Seed(AtelierDbContext db)
    {
        if (db.Clients.Any()) return;

        var suppliers = new[]
        {
            new Supplier { Name = "טמבור", Url = "https://www.tambour.co.il", Note = "צבעים" },
            new Supplier { Name = "נירלט", Url = "https://www.nirlat.com", Note = "צבעים וטיח" },
            new Supplier { Name = "הום סנטר", Url = "https://www.homecenter.co.il", Note = "גמר ותאורה" },
            new Supplier { Name = "ACE", Url = "https://www.ace.co.il", Note = "חומרי בנייה" },
            new Supplier { Name = "אבן קיסר", Url = "https://www.caesarstone.co.il", Note = "משטחים" },
        };
        db.Suppliers.AddRange(suppliers);
        db.Materials.AddRange(
            new Material { Id = "m-paint-white", Name = "צבע אקרילי – לבן שלג", Category = MaterialCategory.Paint, Unit = "ליטר", Price = 32, Supplier = suppliers[0], Coverage = 10, Hex = "#f6f4ef" },
            new Material { Id = "m-paint-sage", Name = "צבע אקרילי – ירוק מרווה", Category = MaterialCategory.Paint, Unit = "ליטר", Price = 38, Supplier = suppliers[1], Coverage = 10, Hex = "#9fae96" },
            new Material { Id = "m-porc-60", Name = "פורצלן 60×60", Category = MaterialCategory.Flooring, Unit = "מ״ר", Price = 119, Supplier = suppliers[2] },
            new Material { Id = "m-parquet", Name = "פרקט למינציה אלון", Category = MaterialCategory.Flooring, Unit = "מ״ר", Price = 89, Supplier = suppliers[2] },
            new Material { Id = "m-tile-bath", Name = "קרמיקה לחדר רטוב", Category = MaterialCategory.Tiles, Unit = "מ״ר", Price = 95, Supplier = suppliers[2] },
            new Material { Id = "m-skirting", Name = "פאנל ריצוף", Category = MaterialCategory.Skirting, Unit = "מטר", Price = 22, Supplier = suppliers[3] },
            new Material { Id = "m-spot", Name = "ספוט LED שקוע", Category = MaterialCategory.Lighting, Unit = "יח׳", Price = 49, Supplier = suppliers[2] },
            new Material { Id = "m-quartz", Name = "משטח קוורץ", Category = MaterialCategory.Kitchen, Unit = "מטר אורך", Price = 1450, Supplier = suppliers[4] });

        var oren = new Client { Name = "משפחת אורן", Phone = "052-7714420", City = "בית שמש" };
        var dagan = new Client { Name = "משפחת דגן", Phone = "054-6620193", City = "ירושלים" };
        db.Clients.AddRange(oren, dagan);
        var renovation = new Project { Client = oren, Name = "הרחבה ושיפוץ דירה", Type = ProjectType.Apartment, City = "בית שמש", AreaSqm = 105, Budget = 420000, Stage = Stage.Construction, Fee = 48000, Paid = 33600 };
        renovation.Plan = new Plan { Name = "דירת 4 חדרים", Geometry = DemoPlan(), UpdatedAt = DateTime.UtcNow };
        renovation.Milestones.Add(new Milestone { Name = "נגרות ומטבח", Start = new(2026, 11, 16), End = new(2026, 12, 31) });
        db.Projects.AddRange(renovation,
            new Project { Client = dagan, Name = "חדרי ילדים", Type = ProjectType.Kids, City = "ירושלים", AreaSqm = 36, Budget = 85000, Stage = Stage.Design, Fee = 14500, Paid = 4350 });
        db.SaveChanges();
    }
}
