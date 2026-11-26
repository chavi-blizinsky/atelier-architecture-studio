using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Atelier.Infrastructure;

/// <summary>Background worker: once a day finds milestones due within a week and raises reminders.</summary>
public class MilestoneReminderService(IServiceScopeFactory scopes, ILogger<MilestoneReminderService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AtelierDbContext>();
                var soon = DateOnly.FromDateTime(DateTime.Today.AddDays(7));
                var due = await db.Milestones.Where(m => !m.Done && m.End <= soon).ToListAsync(stoppingToken);
                foreach (var m in due) log.LogInformation("Reminder: milestone {Name} (project {ProjectId}) is due on {End}", m.Name, m.ProjectId, m.End);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogError(ex, "Milestone reminder run failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
