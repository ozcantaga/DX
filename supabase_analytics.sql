-- =============================================
-- DX PROMO - GELİŞMİŞ ANALİTİK TABLOLARI
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın
-- =============================================

-- 1) site_visits tablosuna yeni sütunlar ekle
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS screen_resolution TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS window_size TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS connection_type TEXT;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS is_touch_device BOOLEAN DEFAULT false;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS battery_charging BOOLEAN;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS max_scroll_percent INTEGER DEFAULT 0;

-- 2) Tıklama logları tablosu (her tıklama ayrı satır)
CREATE TABLE IF NOT EXISTS click_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visit_id UUID REFERENCES site_visits(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    element TEXT,
    page_path TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) click_logs için index (hızlı sorgulama)
CREATE INDEX IF NOT EXISTS idx_click_logs_visit_id ON click_logs(visit_id);
CREATE INDEX IF NOT EXISTS idx_click_logs_created_at ON click_logs(created_at);

-- 4) site_visits tablosuna created_at sütunu ekle (yoksa)
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5) site_visits için ek indexler
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_city ON site_visits(city);
CREATE INDEX IF NOT EXISTS idx_site_visits_country ON site_visits(country);

-- 5) RLS (Row Level Security) - Anonim erişim izni
ALTER TABLE click_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes click_logs ekleyebilir" ON click_logs
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Herkes click_logs okuyabilir" ON click_logs
    FOR SELECT TO anon USING (true);

-- 6) site_visits tablosuna güncelleme izni (time_spent, scroll_depth için)
-- Mevcut politika yoksa ekle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_visits' AND policyname = 'Herkes site_visits güncelleyebilir'
    ) THEN
        CREATE POLICY "Herkes site_visits güncelleyebilir" ON site_visits
            FOR UPDATE TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;
