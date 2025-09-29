using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Services (DI) — MySQL + EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("Default")!;
    options.UseMySql(cs, ServerVersion.AutoDetect(cs));
});

// CORS (frontend için)
builder.Services.AddCors(o =>
{
    o.AddPolicy("dev", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

// MVC / Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// CORS
app.UseCors("dev");

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthorization();
app.UseDefaultFiles();   // index.html'i kökten sun
app.UseStaticFiles();    // wwwroot içini sun
app.MapControllers();


app.Run();
