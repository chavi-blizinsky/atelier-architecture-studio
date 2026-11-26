using System.Text.Json.Serialization;
using Atelier.Api;
using Atelier.Core;
using Atelier.Infrastructure;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AtelierDbContext>(o => o.UseSqlite(builder.Configuration.GetConnectionString("Atelier") ?? "Data Source=atelier.db"));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks().AddDbContextCheck<AtelierDbContext>();
builder.Services.AddHostedService<MilestoneReminderService>();
builder.Services.AddOutputCache(o => o.AddPolicy("catalog", p => p.Expire(TimeSpan.FromMinutes(10))));
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins("http://localhost:4200", "https://chavi-blizinsky.github.io").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AtelierDbContext>();
    db.Database.EnsureCreated();
    Seeder.Seed(db);
}

// Domain rule violations become 409 ProblemDetails in Hebrew instead of 500s.
app.UseExceptionHandler(e => e.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, title) = ex is DomainException ? (StatusCodes.Status409Conflict, ex.Message) : (StatusCodes.Status500InternalServerError, "שגיאה בשרת");
    ctx.Response.StatusCode = status;
    await Results.Problem(title: title, statusCode: status).ExecuteAsync(ctx);
}));
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseOutputCache();

app.MapAtelierEndpoints();
app.MapHealthChecks("/health");
app.Run();

public partial class Program { }
