// scripts/run-live-sync.mjs
setInterval(async () => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] Triggering live score sync...`);
    const res = await fetch("https://g11-drab.vercel.app/api/live-score", {
        method: "POST",
        headers: {
            "Authorization": `Bearer t7443` // (You can also pull this from .env)
        }
    });
    const data = await res.json();
    console.log(data);
}, 300000); // Runs every 5 minutes
