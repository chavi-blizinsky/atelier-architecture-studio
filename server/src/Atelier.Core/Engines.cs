using System.Text.RegularExpressions;

namespace Atelier.Core;

/// <summary>Plan geometry. Input in cm, output in metres / m².</summary>
public static class Geometry
{
    public static double Dist(Pt a, Pt b) => Math.Sqrt(Math.Pow(b.X - a.X, 2) + Math.Pow(b.Y - a.Y, 2));

    /// <summary>Shoelace formula.</summary>
    public static double Area(IReadOnlyList<Pt> p)
    {
        double s = 0;
        for (var i = 0; i < p.Count; i++)
        {
            var (a, b) = (p[i], p[(i + 1) % p.Count]);
            s += a.X * b.Y - b.X * a.Y;
        }
        return Math.Abs(s) / 2 / 10_000;
    }

    public static double Perimeter(IReadOnlyList<Pt> p) => p.Select((a, i) => Dist(a, p[(i + 1) % p.Count])).Sum() / 100;

    public static Pt PointOnWall(Wall w, double t) => new(w.A.X + (w.B.X - w.A.X) * t, w.A.Y + (w.B.Y - w.A.Y) * t);

    public static double DistToSegment(Pt p, Pt a, Pt b)
    {
        var l2 = Math.Pow(b.X - a.X, 2) + Math.Pow(b.Y - a.Y, 2);
        if (l2 == 0) return Dist(p, a);
        var t = Math.Clamp(((p.X - a.X) * (b.X - a.X) + (p.Y - a.Y) * (b.Y - a.Y)) / l2, 0, 1);
        return Dist(p, new Pt(a.X + t * (b.X - a.X), a.Y + t * (b.Y - a.Y)));
    }

    public static IEnumerable<Opening> OpeningsOf(Room room, PlanGeometry plan) =>
        plan.Openings.Where(o =>
        {
            var wall = plan.Walls.FirstOrDefault(w => w.Id == o.WallId);
            if (wall is null) return false;
            var c = PointOnWall(wall, o.T);
            return room.Points.Select((p, i) => DistToSegment(c, p, room.Points[(i + 1) % room.Points.Count])).Min() < 15;
        });
}

public record BoqLine(string Key, string Label, double Quantity, string Unit, string? MaterialId, decimal UnitPrice, decimal Total, string? Note);

/// <summary>Bill of quantities derived from the drawing – same rules as the Angular client.</summary>
public static class Quantities
{
    private const double WindowH = 1.3, DoorH = 2.1, Waste = 1.1;

    public static IReadOnlyList<BoqLine> Calculate(PlanGeometry plan, IReadOnlyDictionary<string, Material> materials, string wallPaintId = "m-paint-white")
    {
        var h = plan.CeilingHeight / 100;
        var lines = new List<BoqLine>();
        BoqLine Line(string key, string label, double qty, string unit, string? matId, string? note)
        {
            var price = matId != null && materials.TryGetValue(matId, out var m) ? m.Price : 0;
            return new BoqLine(key, label, qty, unit, matId, price, price * (decimal)qty, note);
        }

        double wallArea = 0, ceiling = 0, skirting = 0;
        var floors = new Dictionary<string, double>();
        foreach (var r in plan.Rooms)
        {
            var a = Geometry.Area(r.Points);
            floors[r.FloorMaterialId] = floors.GetValueOrDefault(r.FloorMaterialId) + a;
            if (r.Type != RoomType.Balcony) ceiling += a;
            var ops = Geometry.OpeningsOf(r, plan).ToList();
            var openingArea = ops.Sum(o => o.Width / 100 * (o.Kind == OpeningKind.Door ? DoorH : WindowH));
            if (r.Type != RoomType.Bath) wallArea += Geometry.Perimeter(r.Points) * h - openingArea;
            skirting += Geometry.Perimeter(r.Points) - ops.Where(o => o.Kind == OpeningKind.Door).Sum(o => o.Width / 100);
        }

        foreach (var (id, area) in floors)
            lines.Add(Line($"floor-{id}", $"ריצוף – {(materials.TryGetValue(id, out var fm) ? fm.Name : id)}", Math.Ceiling(area * Waste), "מ״ר", id, $"{area:0.0} מ״ר + 10% פחת"));

        var bath = plan.Rooms.Where(r => r.Type == RoomType.Bath).Sum(r => Geometry.Perimeter(r.Points) * h);
        if (bath > 0) lines.Add(Line("bath-walls", "חיפוי קירות חדר רטוב", Math.Ceiling(bath * Waste), "מ״ר", "m-tile-bath", "עד התקרה + 10% פחת"));

        var coverage = materials.TryGetValue(wallPaintId, out var paint) ? paint.Coverage ?? 10 : 10;
        lines.Add(Line("paint", "צבע קירות ותקרה", Math.Ceiling((wallArea + ceiling) * 2 / coverage), "ליטר", wallPaintId, $"{wallArea + ceiling:0} מ״ר × 2 שכבות"));
        lines.Add(Line("skirting", "פאנלים", Math.Ceiling(skirting), "מטר", "m-skirting", null));
        lines.Add(Line("spots", "ספוטים שקועים", Math.Ceiling(ceiling / 2.5), "יח׳", "m-spot", "ספוט לכל 2.5 מ״ר"));

        var kitchenRun = plan.Furniture.Where(f => f.Kind == "kitchen").Sum(f => Math.Max(f.W, f.H) / 100);
        if (kitchenRun > 0) lines.Add(Line("quartz", "משטח עבודה למטבח", Math.Ceiling(kitchenRun * 10) / 10, "מטר אורך", "m-quartz", null));
        return lines;
    }
}

public record RegulationCheck(string Room, string Rule, bool Ok, string Detail);

/// <summary>Rule-of-thumb checks inspired by Israeli planning & building regulations (demo, not legal advice).</summary>
public static class Regulations
{
    private static readonly HashSet<RoomType> Habitable = [RoomType.Living, RoomType.Bedroom, RoomType.Kitchen, RoomType.Mamad];

    public static IReadOnlyList<RegulationCheck> Check(PlanGeometry plan)
    {
        var list = new List<RegulationCheck> { new("כל הדירה", "גובה תקרה ≥ 2.50 מ׳", plan.CeilingHeight >= 250, $"{plan.CeilingHeight / 100:0.00} מ׳") };
        foreach (var r in plan.Rooms)
        {
            var area = Geometry.Area(r.Points);
            var windows = Geometry.OpeningsOf(r, plan).Where(o => o.Kind == OpeningKind.Window).ToList();
            var windowArea = windows.Sum(o => o.Width / 100 * 1.3);
            if (Habitable.Contains(r.Type))
            {
                list.Add(new(r.Name, "שטח חדר מגורים ≥ 8 מ״ר", area >= 8, $"{area:0.0} מ״ר"));
                list.Add(new(r.Name, "שטח חלונות ≥ 10% משטח הרצפה", windowArea >= area * 0.1, $"{windowArea:0.00} מתוך {area * 0.1:0.00} מ״ר"));
            }
            if (r.Type == RoomType.Bath) list.Add(new(r.Name, "חדר רטוב – חלון או אוורור מכני", windows.Count > 0, windows.Count > 0 ? "יש חלון" : "נדרש מאוורר"));
        }
        return list;
    }
}

public record PaymentStage(string Name, int Pct);
public record ProposalDraft(IReadOnlyList<string> Scope, decimal Total, IReadOnlyList<PaymentStage> Stages, IReadOnlyList<string> Reasoning);

/// <summary>Fee-proposal agent: reads the free-text brief, detects scope items and prices them.</summary>
public static class ProposalAgent
{
    private static readonly (Regex Pattern, string Scope, decimal PerSqm)[] Rules =
    [
        (new Regex("היתר|ועדה|תוספת בנייה|הרחבה"), "הכנת תיק היתר וליווי מול הוועדה", 120),
        (new Regex("מטבח"), "תכנון מטבח ונגרות מפורטת", 90),
        (new Regex("ילדים|חדרי"), "עיצוב חדרי ילדים כולל נגרות", 110),
        (new Regex("הדמי|תלת"), "הדמיות תלת-ממד פוטוריאליסטיות", 35),
        (new Regex("פיקוח|ליווי|ביצוע"), "פיקוח עליון וליווי ביצוע", 80),
        (new Regex("תאור|חשמל"), "תכנית תאורה וחשמל", 25),
    ];

    public static ProposalDraft Draft(ProjectType type, double areaSqm, string brief)
    {
        var reasoning = new List<string>();
        var scope = new List<string> { "פגישת אפיון ופרוגרמה", "תכנית העמדה ותכנון אדריכלי" };
        decimal perSqm = type switch { ProjectType.Office => 160, ProjectType.House => 240, _ => 180 };
        reasoning.Add($"בסיס {type}: ₪{perSqm}/מ״ר");
        foreach (var (pattern, s, add) in Rules)
            if (pattern.IsMatch(brief)) { scope.Add(s); perSqm += add; reasoning.Add($"\"{pattern.Match(brief).Value}\" → {s} (+₪{add}/מ״ר)"); }

        var scale = areaSqm > 300 ? 0.75m : areaSqm > 150 ? 0.88m : 1m;
        var total = Math.Max(9000, Math.Round(perSqm * (decimal)areaSqm * scale / 500) * 500);
        return new ProposalDraft(scope, total, [new("חתימה", 20), new("תכנית העמדה", 30), new("תכניות לביצוע", 30), new("מסירה", 20)], reasoning);
    }
}
