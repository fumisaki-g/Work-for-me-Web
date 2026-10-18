// ===== ตั้งค่าที่นี่ที่เดียว =====
window.CONFIG = {
  OWNER: { name: 'วุฒิกร ปั้นนาค', id: '08244', school: 'พระบางวิทยา' },

  // Supabase: Project Settings > API (ใช้ anon public key เท่านั้น ห้ามใส่ service_role)
  SUPABASE_URL: 'https://nmlrtnpmerjftvxqtgta.supabase.co',
  SUPABASE_KEY: 'sb_publishable_US0BJout2EsOhgWsnQs5Lw_ZNhy9aex',

  // Google Sheet การเงิน: ไฟล์ > แชร์ > เผยแพร่ไปยังเว็บ > เลือกแท็บ > รูปแบบ CSV แล้วนำลิงก์มาวาง
  SHEET_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDwd_2TOZ7GhgmYKN2xZdSRl0nFgUR1d6y3FbPGhW-_3S4ZjXGAWEpKxXqYxDuBrqQq-SoLp17Y18d/pub?gid=0&single=true&output=tsv',
  SHEET_EDIT_URL: '',   // ลิงก์เปิดชีตเพื่อแก้ไข (ไม่บังคับ)

  // ลิงก์เพจ Facebook ของโรงเรียน (เพจสาธารณะ) ถ้าใส่ จะแสดงเพจแทนช่องข่าว API
  FB_PAGE_URL: 'https://www.facebook.com/photophrabang?locale=th_TH',   // เช่น 'https://www.facebook.com/ชื่อเพจ'

  // ข่าวประชาสัมพันธ์ (ทางเลือกอื่น): URL ที่ตอบ JSON เป็น [{title,date,url,summary}] (ต้องเปิด CORS)
  NEWS_API_URL: '',

  // ช่องว่างสำหรับ API ภายนอกอื่น ๆ: เรียกใช้ด้วย extApi('/path')
  EXTRA_API_URL: '',
  EXTRA_API_KEY: ''
};


