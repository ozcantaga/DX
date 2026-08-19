export default function handler(req, res) {
    if (req.method === 'POST') {
        // Vercel üzerinde kullanıcının gerçek IP adresi 'x-forwarded-for' header'ı içinde gelir
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmiyor';
        const userAgent = req.headers['user-agent'] || 'Bilinmiyor';
        const timestamp = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
        
        let data = {};
        try {
            data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch(e) {
            data = req.body || {};
        }

        // Vercel Logs ekranında görünecek olan log çıktısı
        console.log(`[ANALYTICS] Tarih: ${timestamp} | IP: ${ip} | Olay: ${data.action} | Eleman: ${data.details || 'Belirtilmedi'} | Tarayıcı: ${userAgent}`);

        res.status(200).json({ success: true, message: 'Log başarıyla Vercel paneline yazdırıldı.' });
    } else {
        res.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
    }
}
