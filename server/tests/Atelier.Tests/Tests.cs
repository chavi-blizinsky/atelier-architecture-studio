using System.Net;
using System.Net.Http.Json;
using Atelier.Core;
using Atelier.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Atelier.Tests;

public class GeometryTests
{
    private static readonly Pt[] Square = [new(0, 0), new(400, 0), new(400, 300), new(0, 300)];

    [Fact] public void Area_and_perimeter_in_metres()
    {
        Assert.Equal(12, Geometry.Area(Square), 6);
        Assert.Equal(14, Geometry.Perimeter(Square), 6);
    }

    [Fact] public void Demo_apartment_area()
    {
        var total = Seeder.DemoPlan().Rooms.Sum(r => Geometry.Area(r.Points));
        Assert.InRange(total, 105, 110);
    }

    [Fact] public void Regulations_flag_small_room_and_low_ceiling()
    {
        var plan = new PlanGeometry(240, [], [new Room("x", "קטן", RoomType.Bedroom, Square.ToList(), "m-parquet")], [], []);
        var failed = Regulations.Check(plan).Where(c => !c.Ok).Select(c => c.Rule).ToList();
        Assert.Contains(failed, r => r.Contains("גובה"));
        Assert.Contains(failed, r => r.Contains("8 מ״ר"));
    }
}

public class AgentTests
{
    [Fact] public void Proposal_detects_scope_and_scales_price()
    {
        var small = ProposalAgent.Draft(ProjectType.Apartment, 100, "מטבח והדמיות");
        Assert.Contains("תכנון מטבח ונגרות מפורטת", small.Scope);
        Assert.Equal(100, small.Stages.Sum(s => s.Pct));
        var large = ProposalAgent.Draft(ProjectType.Apartment, 400, "מטבח והדמיות");
        Assert.True(large.Total / 400 < small.Total / 100); // economies of scale
    }

    [Fact] public void Project_cannot_skip_stages()
    {
        var p = new Project { Stage = Stage.Lead };
        Assert.Throws<DomainException>(() => p.MoveTo(Stage.Permit));
        p.MoveTo(Stage.Concept);
        Assert.Equal(Stage.Concept, p.Stage);
    }
}

public class ApiTests : IClassFixture<ApiTests.Factory>
{
    public class Factory : WebApplicationFactory<Program>
    {
        private readonly string _db = Path.Combine(Path.GetTempPath(), $"atelier-{Guid.NewGuid():N}.db");
        protected override void ConfigureWebHost(IWebHostBuilder b) => b.UseSetting("ConnectionStrings:Atelier", $"Data Source={_db}");
    }

    private readonly HttpClient _http;
    public ApiTests(Factory f) => _http = f.CreateClient();

    [Fact] public async Task Health() => Assert.Equal(HttpStatusCode.OK, (await _http.GetAsync("/health")).StatusCode);

    [Fact] public async Task Quantities_are_computed_from_saved_plan()
    {
        var res = await _http.GetFromJsonAsync<QuantitiesDto>("/api/plans/1/quantities");
        Assert.NotNull(res);
        Assert.True(res!.Total > 10_000);
        Assert.Contains(res.Lines, l => l.Key == "paint");
    }

    [Fact] public async Task Skipping_a_stage_returns_409_problem()
    {
        var res = await _http.PutAsJsonAsync("/api/projects/2/stage", new { stage = "Lead" }); // Design → Lead skips Concept
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
    }

    [Fact] public async Task Proposal_requires_brief()
    {
        var bad = await _http.PostAsJsonAsync("/api/projects/1/proposal", new { brief = "" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        var ok = await _http.PostAsJsonAsync("/api/projects/1/proposal", new { brief = "פיקוח והדמיות" });
        ok.EnsureSuccessStatusCode();
    }

    private record QuantitiesDto(List<LineDto> Lines, decimal Total);
    private record LineDto(string Key, decimal Total);
}
