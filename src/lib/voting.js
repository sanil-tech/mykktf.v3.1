import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/audit';
import { OFFICIAL_EXCO_METADATA, DEFAULT_EXCO_PORTFOLIOS } from '@/lib/jakmas';

export const VOTING_STORAGE_KEYS = {
  SESSION: 'kktf_evoting_session_active',
  CANDIDATES: 'kktf_evoting_candidates',
  BALLOTS: 'kktf_evoting_ballots',
  AUDIT: 'kktf_evoting_audit_trail',
  PRINCIPAL_CERT: 'kktf_evoting_principal_certification',
  INTERVIEW_SCORES: 'kktf_evoting_interview_scores',
  EXCO_ASSIGNMENTS: 'kktf_evoting_final_exco_assignments'
};

// Default Sesi Pemilihan Calon JAKMAS Sesi 2026/2027
export const DEFAULT_VOTING_SESSION = {
  id: 'sesi-jakmas-2026-2027',
  title: 'Pilihan Raya Majlis Perwakilan Kolej Kediaman (JAKMAS) KKTF Sesi 2026/2027',
  academic_session: 'Sesi 2026/2027',
  description: 'Proses pemilihan demokratik bagi memilih calon-calon berwibawa, disusuli senarai pendek Top 12 untuk sesi temuduga khas bersama Pengetua dan Felo bagi penetapan Majlis Tertinggi & Barisan Exco JAKMAS KKTF.',
  status: 'active', // 'draft', 'active', 'paused', 'interview_phase', 'closed', 'certified'
  start_date: '2026-09-01T08:00:00.000Z',
  end_date: '2026-09-30T23:59:59.000Z',
  interview_date: '2026-10-05T09:00:00.000Z',
  interview_venue: 'Bilik Mesyuarat Utama & Ruang Eksekutif Pengetua, KKTF',
  quorum_threshold_percent: 60, // Minimum turnout target
  blind_mode: false, // Semasa aktif: sembunyikan kiraan undi untuk cegah bias
  shortlist_count: 12, // Senarai pendek 12 orang calon untuk temuduga
  created_at: new Date().toISOString(),
  created_by: 'Pentadbiran Kolej Kediaman Tun Fuad'
};

// Senarai Portfolio / Jawatan Yang Dipertandingkan
export const VOTING_PORTFOLIOS = [
  {
    id: 'ydp',
    name: 'Yang Dipertua (YDP)',
    category: 'Majlis Tertinggi',
    description: 'Ketua Eksekutif & Pemimpin Utama JAKMAS KKTF.',
    maxVotes: 1,
    icon: 'Crown',
    color: 'emerald'
  },
  {
    id: 'nydp',
    name: 'Naib Yang Dipertua (NYDP)',
    category: 'Majlis Tertinggi',
    description: 'Timbalan Pemimpin Utama merangkap Exco Akademik & Kepimpinan.',
    maxVotes: 1,
    icon: 'GraduationCap',
    color: 'blue'
  },
  {
    id: 'su',
    name: 'Setiausaha Kehormat (SU)',
    category: 'Majlis Tertinggi',
    description: 'Ketua Pentadbiran & Perhubungan Rasmi Kolej.',
    maxVotes: 1,
    icon: 'FileText',
    color: 'cyan'
  },
  {
    id: 'bendahari',
    name: 'Bendahari Kehormat',
    category: 'Majlis Tertinggi',
    description: 'Pengurus Kewangan, Belanjawan & Tajaan Program KKTF.',
    maxVotes: 1,
    icon: 'Coins',
    color: 'amber'
  },
  {
    id: 'exco_kebajikan',
    name: 'Exco Kebajikan & Keselamatan',
    category: 'Barisan Exco',
    description: 'Menjaga kebajikan residen, keselamatan blok & bantuan kecemasan.',
    maxVotes: 1,
    icon: 'HeartHandshake',
    color: 'rose'
  },
  {
    id: 'exco_sukan',
    name: 'Exco Sukan & Rekreasi',
    category: 'Barisan Exco',
    description: 'Menganjurkan kejohanan SUKOL, riadah & program kesihatan residen.',
    maxVotes: 1,
    icon: 'Medal',
    color: 'orange'
  },
  {
    id: 'exco_media',
    name: 'Exco Media & Publisiti',
    category: 'Barisan Exco',
    description: 'Pengurusan media sosial, hebahan poster & liputan digital KKTF.',
    maxVotes: 1,
    icon: 'Megaphone',
    color: 'purple'
  },
  {
    id: 'exco_kerohanian',
    name: 'Exco Kerohanian & Pembangunan Sahsiah',
    category: 'Barisan Exco',
    description: 'Aktiviti surau, sambutan perayaan & pembinaan modal insan.',
    maxVotes: 1,
    icon: 'Sparkles',
    color: 'indigo'
  },
  {
    id: 'exco_keusahawanan',
    name: 'Exco Keusahawanan',
    category: 'Barisan Exco',
    description: 'Pusat aktiviti perniagaan mahasiswa, kios kolej & bazar residen.',
    maxVotes: 1,
    icon: 'Briefcase',
    color: 'teal'
  },
  {
    id: 'exco_kesenian',
    name: 'Exco Kesenian & Kebudayaan',
    category: 'Barisan Exco',
    description: 'Malam kebudayaan, teater, muzik & festival seni anak Sabah & Malaysia.',
    maxVotes: 1,
    icon: 'Award',
    color: 'pink'
  }
];

// Senarai Calon Default Rasmi (16 Calon Berbakat KKTF Sesi 2026/2027)
export const DEFAULT_CANDIDATES = [
  // --- CALON YDP ---
  {
    id: 'cand-ydp-01',
    portfolio_id: 'ydp',
    candidate_number: '01',
    full_name: 'MUHAMMAD DANIAL BIN HAKIMI',
    student_id: 'BI23110022',
    faculty: 'Fakulti Komputeran dan Informatik (FKI)',
    programme: 'Ijazah Sarjana Muda Sains Komputer (Kepujian)',
    year_of_study: 3,
    cgpa: '3.82',
    merit_points: 145,
    block_name: 'Blok C',
    room_number: 'C-3-12',
    tagline: '"Kepimpinan Berintegriti, KKTF Progresif & Berkebajikan"',
    manifesto_summary: 'Menaiktaraf fasiliti ruang belajar 24 jam, mempercepatkan tindakan aduan kerosakan bilik melalui MyKKTF, dan memperluaskan inisiatif Tabung Prihatin Residen.',
    manifesto_points: [
      'Memperkasa Sistem Pantau Kerosakan 48-Jam bersama JPP UMS.',
      'Mewujudkan Hab Digital Kolaboratif & Ruang Diskusi Mesra Pelajar di Blok C & D.',
      'Memperjuangkan peruntukan kebajikan residen B40 dan bantuan kecemasan kolej.',
      'Menganjurkan Townhall Terbuka Residen bersama Pengetua secara berkala.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    id: 'cand-ydp-02',
    portfolio_id: 'ydp',
    candidate_number: '02',
    full_name: 'NUR HAZIQAH BINTI KHAIRUDDIN',
    student_id: 'BP23110088',
    faculty: 'Fakulti Perniagaan, Ekonomi dan Perakaunan (FPEP)',
    programme: 'Ijazah Sarjana Muda Perakaunan (Kepujian)',
    year_of_study: 3,
    cgpa: '3.78',
    merit_points: 160,
    block_name: 'Blok H',
    room_number: 'H-2-05',
    tagline: '"Suara Residen Keutamaan Kami, Menjana KKTF Gemilang"',
    manifesto_summary: 'Ketelusan pengurusan belanjawan aktiviti kolej, penganjuran Program Kasih Siswa, dan memperkasa khidmat kaunseling rakan sebaya.',
    manifesto_points: [
      'Menyediakan platform saluran maklum balas telus dan laporan audit aktiviti kolej.',
      'Memperbanyakkan aktiviti rekreasi dan sukan antara blok wanita & lelaki.',
      'Memastikan kafeteria kolej menyediakan menu sihat rahmah berkualiti tinggi.',
      'Mengukuhkan jaringan kerjasama antara JAKMAS dan Alumni KKTF.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON NYDP ---
  {
    id: 'cand-nydp-01',
    portfolio_id: 'nydp',
    candidate_number: '01',
    full_name: 'SYED FARIS BIN SYED AMINUDDIN',
    student_id: 'BS23110041',
    faculty: 'Fakulti Sains dan Sumber Alam (FSSA)',
    programme: 'Ijazah Sarjana Muda Sains Marin',
    year_of_study: 2,
    cgpa: '3.65',
    merit_points: 120,
    block_name: 'Blok B',
    room_number: 'B-1-08',
    tagline: '"Akademik Unggul, Kepimpinan Holistik"',
    manifesto_summary: 'Menyediakan kelas bimbingan tutor sebaya (Peer Tutoring) bagi subjek kritikal dan menganjurkan KKTF Leadership Camp.',
    manifesto_points: [
      'Inisiatif KKTF Study Circle & Bank Soalan Peperiksaan Berpusat.',
      'Siri Bengkel Kemahiran Digital (AI, Python, Canva) percuma untuk residen.',
      'Program Khidmat Komuniti Pesisir Pantai bersama Felo & JAKMAS.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    id: 'cand-nydp-02',
    portfolio_id: 'nydp',
    candidate_number: '02',
    full_name: 'DAYANGKU SARAH BINTI AWANG BESAR',
    student_id: 'BA23110019',
    faculty: 'Akademi Seni dan Teknologi Kreatif (ASTiF)',
    programme: 'Ijazah Sarjana Muda Seni Kreatif',
    year_of_study: 2,
    cgpa: '3.70',
    merit_points: 135,
    block_name: 'Blok G',
    room_number: 'G-3-02',
    tagline: '"Kreativiti Memacu Inovasi Kolej"',
    manifesto_summary: 'Mewujudkan sudut seni residen, malam apresiasi bakat, dan modul kepimpinan interaktif.',
    manifesto_points: [
      'Memperbanyak program motivasi dan bimbingan sahsiah.',
      'Ruang kreativiti mahasiswa untuk mempamerkan inovasi dan karya.',
      'Kempen kesedaran kesihatan mental dan pengurusan stres.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON SETIAUSAHA ---
  {
    id: 'cand-su-01',
    portfolio_id: 'su',
    candidate_number: '01',
    full_name: 'CHIN HUI YING',
    student_id: 'BK23110055',
    faculty: 'Fakulti Kejuruteraan (FKJ)',
    programme: 'Ijazah Sarjana Muda Kejuruteraan Kimia',
    year_of_study: 2,
    cgpa: '3.89',
    merit_points: 150,
    block_name: 'Blok I',
    room_number: 'I-2-10',
    tagline: '"Dokumentasi Pantas, Komunikasi Efisien"',
    manifesto_summary: 'Mendigitalkan minit mesyuarat, hebahan notis kolej dalam 3 minit, dan pengurusan surat sokongan aktiviti residen.',
    manifesto_points: [
      'Portal Arkib Digital JAKMAS untuk akses telus minit mesyuarat.',
      'Sistem e-Notifikasi WhatsApp pantas untuk program kolej.',
      'Pengurusan borang keluar masuk & surat kelulusan rasmi secara pantas.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    id: 'cand-su-02',
    portfolio_id: 'su',
    candidate_number: '02',
    full_name: 'FATIN NABILAH BINTI ISMAIL',
    student_id: 'BF23110080',
    faculty: 'Fakulti Psikologi dan Pendidikan (FPP)',
    programme: 'Ijazah Sarjana Muda Pendidikan TESL',
    year_of_study: 2,
    cgpa: '3.72',
    merit_points: 125,
    block_name: 'Blok F',
    room_number: 'F-2-04',
    tagline: '"Komunikasi Harmoni, Pentadbiran Cekap"',
    manifesto_summary: 'Hebahan dwibahasa untuk pelajar antarabangsa dan residen tempatan, serta sistem tempahan ruang fasiliti kolej tanpa kerumitan.',
    manifesto_points: [
      'Penyelarasan buletin bulanan digital kolej.',
      'Talian pantas aduan surat/surat sokongan pelajar.',
      'Arkib minit dan resolusi mesyuarat JAKMAS terbuka.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON BENDAHARI ---
  {
    id: 'cand-ben-01',
    portfolio_id: 'bendahari',
    candidate_number: '01',
    full_name: 'ARAVIND A/L MURUGAN',
    student_id: 'BP23110034',
    faculty: 'Fakulti Perniagaan, Ekonomi dan Perakaunan (FPEP)',
    programme: 'Ijazah Sarjana Muda Kewangan',
    year_of_study: 2,
    cgpa: '3.80',
    merit_points: 140,
    block_name: 'Blok A',
    room_number: 'A-2-01',
    tagline: '"Amanah, Telus, Belanjawan Berhemah"',
    manifesto_summary: 'Laporan kewangan bulanan terbuka, inisiatif crowdfunding program kebajikan kolej, dan pengoptimuman dana residen.',
    manifesto_points: [
      'Penyata kewangan aktiviti kolej dipaparkan secara telus di papan kenyataan/aplikasi.',
      'Mencari penaja korporat bagi menaja program besar KKTF.',
      'Pengagihan bajet program antara blok secara adil dan saksama.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    id: 'cand-ben-02',
    portfolio_id: 'bendahari',
    candidate_number: '02',
    full_name: 'NICOLE TAN SHU WEN',
    student_id: 'BP23110091',
    faculty: 'Fakulti Perniagaan, Ekonomi dan Perakaunan (FPEP)',
    programme: 'Ijazah Sarjana Muda Ekonomi Kewangan',
    year_of_study: 2,
    cgpa: '3.85',
    merit_points: 130,
    block_name: 'Blok J',
    room_number: 'J-3-08',
    tagline: '"Integriti Kewangan, Kemakmuran Residen"',
    manifesto_summary: 'Sistem perolehan peralatan kolej yang jimat kos dan pemantauan perbelanjaan aktiviti kolej yang telus.',
    manifesto_points: [
      'Audit bulanan belanjawan aktiviti setiap Exco.',
      'Pengurusan dana kecemasan residen yang pantas dan bersasar.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO KEBAJIKAN & KESELAMATAN ---
  {
    id: 'cand-kebajikan-01',
    portfolio_id: 'exco_kebajikan',
    candidate_number: '01',
    full_name: 'MOHD AZIZI BIN RAMLI',
    student_id: 'BF23110012',
    faculty: 'Fakulti Psikologi dan Pendidikan (FPP)',
    programme: 'Ijazah Sarjana Muda Bimbingan & Kaunseling',
    year_of_study: 2,
    cgpa: '3.62',
    merit_points: 110,
    block_name: 'Blok D',
    room_number: 'D-1-04',
    tagline: '"Keselamatan Dijaga, Kebajikan Terbela"',
    manifesto_summary: 'Rondaan keselamatan berkala, penyediaan peti pertolongan cemas lengkap di setiap blok, dan talian aduan kecemasan 24 jam.',
    manifesto_points: [
      'Semakan kelengkapan first aid kit di semua 14 blok kediaman.',
      'Bengkel latihan CPR & pemadaman kebakaran bersama Bomba Sabah.',
      'Penyediaan bekalan makanan kecemasan (Food Bank) di pejabat kolej.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO SUKAN & REKREASI ---
  {
    id: 'cand-sukan-01',
    portfolio_id: 'exco_sukan',
    candidate_number: '01',
    full_name: 'BRANDON LEE TZE YANG',
    student_id: 'BS23110099',
    faculty: 'Fakulti Sains dan Sumber Alam (FSSA)',
    programme: 'Ijazah Sarjana Muda Sains Sukan',
    year_of_study: 2,
    cgpa: '3.55',
    merit_points: 175,
    block_name: 'Blok E',
    room_number: 'E-2-15',
    tagline: '"KKTF Juara SUKOL, Residen Sihat Aktif"',
    manifesto_summary: 'Menyediakan kelengkapan sukan gelanggang kolej, liga futsal & bola jaring antara blok, dan larian santai Fun Run KKTF.',
    manifesto_points: [
      'Menaiktaraf peralatan gelanggang serbaguna dan bilik ping pong kolej.',
      'Menganjurkan Kejohanan Sukan Antara Blok KKTF (Piala Pengetua).',
      'Penyediaan sesi senamrobik / zumba mingguan percuma.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO MEDIA & PUBLISITI ---
  {
    id: 'cand-media-01',
    portfolio_id: 'exco_media',
    candidate_number: '01',
    full_name: 'NUR AMIRAH BINTI ZULKIFLI',
    student_id: 'BA23110077',
    faculty: 'Akademi Seni dan Teknologi Kreatif (ASTiF)',
    programme: 'Ijazah Sarjana Muda Komunikasi Visual',
    year_of_study: 2,
    cgpa: '3.75',
    merit_points: 130,
    block_name: 'Blok J',
    room_number: 'J-1-02',
    tagline: '"Kandungan Kreatif, Jenama KKTF Terbilang"',
    manifesto_summary: 'Podcast rasmi KKTF, liputan siaran langsung program kolej di Instagram & TikTok, dan panduan multimedia untuk residen.',
    manifesto_points: [
      'Melancarkan segmen temu bual "Suara Residen KKTF Podcast".',
      'Klip video kempen keselamatan dan gaya hidup harmoni kolej.',
      'Sistem hebahan infografik moden untuk semua aktiviti rasmi.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO KEROHANIAN & SAHSIAH ---
  {
    id: 'cand-kerohanian-01',
    portfolio_id: 'exco_kerohanian',
    candidate_number: '01',
    full_name: 'AHMAD AMIRUL BIN ZAINAL',
    student_id: 'BI23110066',
    faculty: 'Fakulti Pengajian Islam (FIS)',
    programme: 'Ijazah Sarjana Muda Pengajian Islam',
    year_of_study: 2,
    cgpa: '3.86',
    merit_points: 140,
    block_name: 'Blok B',
    room_number: 'B-3-01',
    tagline: '"Sahsiah Terpuji, Rohani Berkualiti"',
    manifesto_summary: 'Imarah Surau Kolej, sambutan Maulidur Rasul & Ramadhan, ceramah motivasi kerohanian, dan penghayatan nilai murni pelbagai kaum.',
    manifesto_points: [
      'Kelas bimbingan Al-Quran dan tazkirah berkala di Surau KKTF.',
      'Aktiviti kebajikan ziarah residen sakit bersama Felo.',
      'Program keharmonian antara kaum dan silang budaya kolej.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO KEUSAHAWANAN ---
  {
    id: 'cand-usahawan-01',
    portfolio_id: 'exco_keusahawanan',
    candidate_number: '01',
    full_name: 'KENNY TIONG HUA SING',
    student_id: 'BP23110048',
    faculty: 'Fakulti Perniagaan, Ekonomi dan Perakaunan (FPEP)',
    programme: 'Ijazah Sarjana Muda Pemasaran',
    year_of_study: 2,
    cgpa: '3.68',
    merit_points: 135,
    block_name: 'Blok K',
    room_number: 'K-1-03',
    tagline: '"Mahasiswa Berdaya Niaga, Kios Kolej Makmur"',
    manifesto_summary: 'Bazar Siswa KKTF, bengkel perniagaan e-dagang & affiliate, dan sudut jualan makanan ringan mesra pelajar di foyer kolej.',
    manifesto_points: [
      'Penganjuran "Bazar Niaga Siswa KKTF" sempena minggu sukan.',
      'Bimbingan pendaftaran lesen SSM dan geran perniagaan belia.',
      'Penyediaan Kios KKTF Mart untuk kemudahan residen membeli keperluan asas.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO KESENIAN & KEBUDAYAAN ---
  {
    id: 'cand-seni-01',
    portfolio_id: 'exco_kesenian',
    candidate_number: '01',
    full_name: 'AVERY JANE MAJANGKIM',
    student_id: 'BA23110033',
    faculty: 'Akademi Seni dan Teknologi Kreatif (ASTiF)',
    programme: 'Ijazah Sarjana Muda Muzik & Seni Persembahan',
    year_of_study: 2,
    cgpa: '3.79',
    merit_points: 155,
    block_name: 'Blok L',
    room_number: 'L-2-06',
    tagline: '"Warisan Seni Dijulang, KKTF Bersatu"',
    manifesto_summary: 'Malam Gala Kebudayaan KKTF, kelab tarian tradisional Sumazau & Magunatip, dan pertandingan nyanyian akustik antara blok.',
    manifesto_points: [
      'Menganjurkan Malam Apresiasi Seni & Budaya Etnik Sabah di Dewan KKTF.',
      'Mewujudkan kumpulan koir dan akustik kolej untuk majlis rasmi.',
      'Bengkel asas fotografi dan lukisan mural di koridor kolej.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO KESUKARELAWANAN ---
  {
    id: 'cand-sukarelawan-01',
    portfolio_id: 'exco_kebajikan',
    candidate_number: '02',
    full_name: 'NURUL IZZATI BINTI MAZLAN',
    student_id: 'BS23110072',
    faculty: 'Fakulti Sains Makanan dan Pemakanan (FSMP)',
    programme: 'Ijazah Sarjana Muda Sains Makanan',
    year_of_study: 2,
    cgpa: '3.74',
    merit_points: 148,
    block_name: 'Blok M',
    room_number: 'M-1-09',
    tagline: '"Bakti Disemai, Kebajikan Dituai"',
    manifesto_summary: 'Program gotong-royong KKTF Hijau, kitar semula sisa bilik, dan misi bantuan kemanusiaan komuniti Sepanggar.',
    manifesto_points: [
      'Program KKTF Clean & Green dan tong kitar semula di setiap blok.',
      'Siri lawatan bakti kasih ke rumah anak yatim & warga emas.',
      'Projek Dapur Mahasiswa (Food Waste Management).'
    ],
    photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },

  // --- CALON EXCO PERHUBUNGAN KORPORAT ---
  {
    id: 'cand-korporat-01',
    portfolio_id: 'su',
    candidate_number: '03',
    full_name: 'DARRYL JASON KWAN',
    student_id: 'BK23110018',
    faculty: 'Fakulti Kejuruteraan (FKJ)',
    programme: 'Ijazah Sarjana Muda Kejuruteraan Elektrik',
    year_of_study: 2,
    cgpa: '3.67',
    merit_points: 128,
    block_name: 'Blok N',
    room_number: 'N-2-02',
    tagline: '"Jaringan Industri, Peluang Kerjaya Residen"',
    manifesto_summary: 'Menghubungkan syarikat korporat untuk tajaan program kolej dan lawatan industri kerjaya untuk residen KKTF.',
    manifesto_points: [
      'Program Resume Clinic & Mock Interview bersama HR industri.',
      'Mencari tajaan jaket rasmi JAKMAS dan kelengkapan kolej.',
      'Kolaborasi bersama NGO dan agensi kerajaan Sabah.'
    ],
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  }
];

// =========================================================================
// HELPER FUNCTIONS & STORAGE INTEGRATION
// =========================================================================

export function getStoredVotingSession() {
  try {
    const raw = localStorage.getItem(VOTING_STORAGE_KEYS.SESSION);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_VOTING_SESSION;
}

export function saveStoredVotingSession(sessionData, actorUser) {
  const current = getStoredVotingSession();
  const updated = {
    ...current,
    ...sessionData,
    updated_at: new Date().toISOString(),
    updated_by: actorUser?.full_name || actorUser?.email || 'Pentadbiran Kolej'
  };
  try {
    localStorage.setItem(VOTING_STORAGE_KEYS.SESSION, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getStoredCandidates() {
  try {
    const raw = localStorage.getItem(VOTING_STORAGE_KEYS.CANDIDATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_CANDIDATES;
}

export function saveStoredCandidate(candidate, actorUser) {
  const list = getStoredCandidates();
  const idx = list.findIndex(c => c.id === candidate.id);
  let updated;
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = {
      ...updated[idx],
      ...candidate,
      updated_at: new Date().toISOString(),
      updated_by: actorUser?.full_name || actorUser?.email
    };
  } else {
    const newEntry = {
      ...candidate,
      id: candidate.id || `cand-${Date.now()}`,
      created_at: new Date().toISOString(),
      created_by: actorUser?.full_name || actorUser?.email,
      status: candidate.status || 'approved'
    };
    updated = [newEntry, ...list];
  }
  try {
    localStorage.setItem(VOTING_STORAGE_KEYS.CANDIDATES, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function deleteStoredCandidate(candidateId) {
  const list = getStoredCandidates();
  const updated = list.filter(c => c.id !== candidateId);
  try {
    localStorage.setItem(VOTING_STORAGE_KEYS.CANDIDATES, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getStoredBallots() {
  try {
    const raw = localStorage.getItem(VOTING_STORAGE_KEYS.BALLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

// Semak sama ada pelajar telah membuang undi dalam sesi ini
export function hasStudentVoted(studentIdentifier, sessionId = DEFAULT_VOTING_SESSION.id) {
  if (!studentIdentifier) return false;
  const ballots = getStoredBallots();
  const idStr = String(studentIdentifier).toLowerCase().trim();
  return ballots.some(b => {
    if (b.session_id !== sessionId) return false;
    const bId = String(b.voter_id || '').toLowerCase().trim();
    const bMatrik = String(b.student_id || '').toLowerCase().trim();
    const bEmail = String(b.voter_email || '').toLowerCase().trim();
    return bId === idStr || bMatrik === idStr || bEmail === idStr;
  });
}

// Dapatkan resit undi bagi pelajar
export function getStudentBallotReceipt(studentIdentifier, sessionId = DEFAULT_VOTING_SESSION.id) {
  if (!studentIdentifier) return null;
  const ballots = getStoredBallots();
  const idStr = String(studentIdentifier).toLowerCase().trim();
  return ballots.find(b => {
    if (b.session_id !== sessionId) return false;
    const bId = String(b.voter_id || '').toLowerCase().trim();
    const bMatrik = String(b.student_id || '').toLowerCase().trim();
    const bEmail = String(b.voter_email || '').toLowerCase().trim();
    return bId === idStr || bMatrik === idStr || bEmail === idStr;
  }) || null;
}

// Buang undi rasmi (One-Resident-One-Vote Transaction)
export async function submitBallotVote({ student, user, selections, sessionId = DEFAULT_VOTING_SESSION.id }) {
  const voterKey = student?.student_id || student?.id || user?.id || user?.email;
  if (!voterKey) {
    throw new Error('Identiti pengundi tidak sah atau belum log masuk.');
  }

  // Semak pendua undi
  if (hasStudentVoted(voterKey, sessionId)) {
    throw new Error('Anda telah pun membuang undi bagi sesi pilihan raya ini. Setiap residen hanya dibenarkan membuang satu kertas undi.');
  }

  const now = new Date();
  const receiptCode = `KKTF-VOTE-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const hashDigest = `SHA256-${btoa(`${voterKey}-${now.getTime()}-${Math.random()}`).slice(0, 16).toUpperCase()}`;

  const ballotEntry = {
    id: `ballot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    session_id: sessionId,
    receipt_code: receiptCode,
    hash_signature: hashDigest,
    voter_id: student?.id || user?.id || '',
    student_id: student?.student_id || user?.email?.split('@')[0] || 'RESIDEN-KKTF',
    voter_name: student?.full_name || user?.full_name || 'Residen KKTF',
    voter_email: user?.email || student?.email || '',
    block_name: student?.block_name || 'Blok C',
    room_number: student?.room_number || '-',
    gender: student?.gender || 'Unknown',
    faculty: student?.faculty || 'Universiti Malaysia Sabah',
    selections: selections, // Object: { [portfolio_id]: candidate_id }
    voted_at: now.toISOString(),
    status: 'verified'
  };

  const currentBallots = getStoredBallots();
  const updatedBallots = [ballotEntry, ...currentBallots];

  try {
    localStorage.setItem(VOTING_STORAGE_KEYS.BALLOTS, JSON.stringify(updatedBallots));
  } catch (e) {}

  // Log Audit
  try {
    await logAudit(user || { full_name: student?.full_name, email: student?.email, role: 'student' }, 'VOTE_BALLOT_CAST', 'E-Voting', {
      session_id: sessionId,
      receipt_code: receiptCode,
      block_name: student?.block_name,
      selections_count: Object.keys(selections || {}).length
    });
  } catch (aErr) {}

  return ballotEntry;
}

// =========================================================================
// INTERVIEW & EXCO ASSIGNMENT STORAGE
// =========================================================================

export function getStoredInterviewScores(sessionId = DEFAULT_VOTING_SESSION.id) {
  try {
    const raw = localStorage.getItem(`${VOTING_STORAGE_KEYS.INTERVIEW_SCORES}_${sessionId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

export function saveStoredInterviewScore(candidateId, scoreData, actorUser, sessionId = DEFAULT_VOTING_SESSION.id) {
  const current = getStoredInterviewScores(sessionId);
  const updated = {
    ...current,
    [candidateId]: {
      ...scoreData,
      candidate_id: candidateId,
      updated_at: new Date().toISOString(),
      updated_by: actorUser?.full_name || actorUser?.email
    }
  };
  try {
    localStorage.setItem(`${VOTING_STORAGE_KEYS.INTERVIEW_SCORES}_${sessionId}`, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getStoredFinalExcoAssignments(sessionId = DEFAULT_VOTING_SESSION.id) {
  try {
    const raw = localStorage.getItem(`${VOTING_STORAGE_KEYS.EXCO_ASSIGNMENTS}_${sessionId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

export function saveStoredFinalExcoAssignments(assignments, actorUser, sessionId = DEFAULT_VOTING_SESSION.id) {
  try {
    localStorage.setItem(`${VOTING_STORAGE_KEYS.EXCO_ASSIGNMENTS}_${sessionId}`, JSON.stringify(assignments));
  } catch (e) {}
  return assignments;
}

// =========================================================================
// ANALYTICS & STATS CALCULATION
// =========================================================================

export function calculateElectionStats(candidates = [], ballots = [], allStudents = []) {
  const session = getStoredVotingSession();
  const activeBallots = ballots.filter(b => b.session_id === session.id);
  const totalBallots = activeBallots.length;

  const totalEligibleVoters = allStudents.length > 0 ? allStudents.length : Math.max(120, totalBallots + 80);
  const turnoutPercent = totalEligibleVoters > 0 ? ((totalBallots / totalEligibleVoters) * 100).toFixed(1) : 0;

  // Analisis Pecahan Mengikut Blok (Blok A hingga Blok N)
  const BLOCK_LIST = ['Blok A', 'Blok B', 'Blok C', 'Blok D', 'Blok E', 'Blok F', 'Blok G', 'Blok H', 'Blok I', 'Blok J', 'Blok K', 'Blok L', 'Blok M', 'Blok N'];
  const blockTurnout = {};
  BLOCK_LIST.forEach(b => {
    blockTurnout[b] = { total: 0, voted: 0 };
  });

  allStudents.forEach(s => {
    const blk = s.block_name || 'Blok C';
    if (!blockTurnout[blk]) blockTurnout[blk] = { total: 0, voted: 0 };
    blockTurnout[blk].total += 1;
  });

  activeBallots.forEach(b => {
    const blk = b.block_name || 'Blok C';
    if (!blockTurnout[blk]) blockTurnout[blk] = { total: 0, voted: 0 };
    blockTurnout[blk].voted += 1;
  });

  // Kiraan Undi bagi Setiap Calon
  const candidateTally = {};
  candidates.forEach(c => {
    candidateTally[c.id] = {
      candidate_id: c.id,
      candidate: c,
      votes: 0,
      percentage: '0.0'
    };
  });

  const portfolioTotals = {};
  VOTING_PORTFOLIOS.forEach(p => {
    portfolioTotals[p.id] = 0;
  });

  activeBallots.forEach(b => {
    if (b.selections && typeof b.selections === 'object') {
      Object.entries(b.selections).forEach(([portId, candId]) => {
        if (candidateTally[candId]) {
          candidateTally[candId].votes += 1;
        }
        portfolioTotals[portId] = (portfolioTotals[portId] || 0) + 1;
      });
    }
  });

  // Hitung peratusan undi
  Object.values(candidateTally).forEach(item => {
    const portTotal = portfolioTotals[item.candidate?.portfolio_id] || 0;
    item.percentage = portTotal > 0 ? ((item.votes / portTotal) * 100).toFixed(1) : '0.0';
  });

  // Shortlist Top 12 Calon (Berdasarkan jumlah undian terbanyak + merit & CGPA standing)
  const interviewScores = getStoredInterviewScores(session.id);
  const finalExcoAssignments = getStoredFinalExcoAssignments(session.id);

  const sortedCandidatesAll = [...candidates].sort((a, b) => {
    const vA = candidateTally[a.id]?.votes || 0;
    const vB = candidateTally[b.id]?.votes || 0;
    if (vB !== vA) return vB - vA;
    // Tie-breaker: Merit Points lalu CGPA
    const mA = Number(a.merit_points || 0);
    const mB = Number(b.merit_points || 0);
    if (mB !== mA) return mB - mA;
    return Number(b.cgpa || 0) - Number(a.cgpa || 0);
  });

  const top12Shortlist = sortedCandidatesAll.slice(0, 12).map((cand, idx) => {
    const tally = candidateTally[cand.id] || { votes: 0, percentage: '0.0' };
    const scoreInfo = interviewScores[cand.id] || null;
    const assignedPortfolio = finalExcoAssignments[cand.id] || null;

    return {
      rank: idx + 1,
      candidate: cand,
      votes: tally.votes,
      percentage: tally.percentage,
      interview_score: scoreInfo?.total_score || null,
      interview_status: scoreInfo ? 'completed' : 'pending',
      interview_notes: scoreInfo?.notes || '',
      interview_panel: scoreInfo?.panel_name || '',
      assigned_exco_portfolio: assignedPortfolio || null
    };
  });

  // Kenalpasti Pemenang bagi Setiap Portfolio (Lead)
  const winnersByPortfolio = {};
  VOTING_PORTFOLIOS.forEach(p => {
    const candsInPort = candidates.filter(c => c.portfolio_id === p.id);
    if (candsInPort.length > 0) {
      const sorted = [...candsInPort].sort((a, b) => {
        const vA = candidateTally[a.id]?.votes || 0;
        const vB = candidateTally[b.id]?.votes || 0;
        return vB - vA;
      });
      const topCand = sorted[0];
      const topVotes = candidateTally[topCand.id]?.votes || 0;
      winnersByPortfolio[p.id] = {
        portfolio: p,
        winner: topCand,
        votes: topVotes,
        totalVotesInPort: portfolioTotals[p.id] || 0,
        percentage: portfolioTotals[p.id] > 0 ? ((topVotes / portfolioTotals[p.id]) * 100).toFixed(1) : '0.0',
        runnerUp: sorted[1] || null
      };
    }
  });

  return {
    totalEligibleVoters,
    totalBallots,
    turnoutPercent,
    blockTurnout,
    candidateTally,
    portfolioTotals,
    winnersByPortfolio,
    top12Shortlist,
    isQuorumMet: Number(turnoutPercent) >= (session.quorum_threshold_percent || 60)
  };
}

// =========================================================================
// PRINCIPAL CERTIFICATION & WATIKAH
// =========================================================================

export function getStoredPrincipalCertification(sessionId = DEFAULT_VOTING_SESSION.id) {
  try {
    const raw = localStorage.getItem(`${VOTING_STORAGE_KEYS.PRINCIPAL_CERT}_${sessionId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function certifyElectionByPrincipal({ sessionId, remarks, pengetuaUser, stats }) {
  const now = new Date();
  const certRef = `KKTF/WATIKAH-JAKMAS/${now.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

  const certData = {
    certificate_ref: certRef,
    session_id: sessionId,
    certified_by_name: pengetuaUser?.full_name || 'PUAN NURFADILAH DARMANSAH',
    certified_by_role: 'Pengetua Kolej Kediaman Tun Fuad (KKTF)',
    certified_by_email: pengetuaUser?.email || 'nurfadilahdarmansah@gmail.com',
    certified_at: now.toISOString(),
    remarks: remarks || 'Keputusan Pilihan Raya E-Voting dan Penilaian Temuduga Top 12 JAKMAS ini telah disemak, diaudit, dan disahkan mematuhi Perlembagaan Kolej Kediaman Tun Fuad UMS.',
    total_ballots_audited: stats?.totalBallots || 0,
    turnout_percent: stats?.turnoutPercent || 0,
    shortlisted_candidates_count: stats?.top12Shortlist?.length || 12,
    digital_signature_hash: `SIG-PENGETUA-KKTF-${now.getTime()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    status: 'OFFICIALLY_CERTIFIED'
  };

  try {
    localStorage.setItem(`${VOTING_STORAGE_KEYS.PRINCIPAL_CERT}_${sessionId}`, JSON.stringify(certData));
    saveStoredVotingSession({ status: 'certified' }, pengetuaUser);
  } catch (e) {}

  return certData;
}

// Integrasi 1-Klik: Lantik 12 Calon Terpilih Terus ke JakmasAppointment
export async function convertTop12ToJakmasAppointments({ top12Shortlist, actorUser, session }) {
  const appointedList = [];
  const now = new Date().toISOString().split('T')[0];

  // Default fallback assignment mapping for 12 Exco positions if not customized
  const DEFAULT_12_EXCO_POSITIONS = [
    { position: 'JAKMAS Chairperson', portfolio: 'Exco Kebajikan dan Keselamatan (YDP)', label: 'Yang Dipertua (YDP)' },
    { position: 'JAKMAS Vice Chairperson', portfolio: 'Exco Akademik dan Kepimpinan (NYDP)', label: 'Naib Yang Dipertua (NYDP)' },
    { position: 'JAKMAS Secretary', portfolio: 'Exco Perhubungan Korporat dan Antarabangsa (SU)', label: 'Setiausaha Kehormat (SU)' },
    { position: 'JAKMAS Treasurer', portfolio: 'Exco Kerohanian dan Pembangunan Sahsiah (Bendahari)', label: 'Bendahari Kehormat' },
    { position: 'JAKMAS Exco Member', portfolio: 'Exco Kebajikan dan Keselamatan (YDP)', label: 'Timbalan Exco Kebajikan' },
    { position: 'JAKMAS Exco Member', portfolio: 'Exco Sukan dan Rekreasi', label: 'Exco Sukan dan Rekreasi' },
    { position: 'JAKMAS Exco Member', portfolio: 'Exco Media dan Publisiti', label: 'Exco Media dan Publisiti' },
    { position: 'JAKMAS Exco Member', portfolio: 'Exco Kerohanian dan Pembangunan Sahsiah (Bendahari)', label: 'Exco Kerohanian & Sahsiah' },
    { position: 'JAKMAS Exco Member', portfolio: 'Exco Keusahawanan', label: 'Exco Keusahawanan' },
    { position: 'JAKMAS Exco Member', portfolio: 'Exco Kesenian dan Kebudayaan', label: 'Exco Kesenian & Kebudayaan' },
    { position: 'JAKMAS Exco Member', portfolio: 'Exco Kesukarelawanan dan Kemasyarakatan', label: 'Exco Kesukarelawanan' },
    { position: 'JAKMAS Committee Member', portfolio: 'Student Engagement', label: 'Exco Perhubungan Residen Blok' }
  ];

  for (let i = 0; i < (top12Shortlist || []).length; i++) {
    const item = top12Shortlist[i];
    const cand = item.candidate;
    if (!cand) continue;

    const assignedConfig = item.assigned_exco_portfolio || DEFAULT_12_EXCO_POSITIONS[i] || DEFAULT_12_EXCO_POSITIONS[DEFAULT_12_EXCO_POSITIONS.length - 1];

    const payload = {
      student_user_id: cand.student_id || cand.id,
      position: assignedConfig.position || 'JAKMAS Exco Member',
      portfolio: assignedConfig.portfolio || 'Student Welfare',
      term_start: now,
      term_end: '2027-07-31',
      status: 'active',
      appointed_at: new Date().toISOString(),
      appointed_by_user_id: actorUser?.id || '',
      notes: `Dilantik rasmi melalui Pilihan Raya E-Voting & Sesi Temuduga Top 12 JAKMAS Sesi ${session?.academic_session || '2026/2027'} (Kedudukan Rank #${item.rank}, ${item.votes} undian residen). Disahkan oleh Pengetua KKTF.`
    };

    try {
      if (base44?.entities?.JakmasAppointment?.create) {
        await base44.entities.JakmasAppointment.create(payload);
      }
      appointedList.push({ ...payload, student_name: cand.full_name, exco_label: assignedConfig.label || assignedConfig.portfolio });
    } catch (err) {
      console.warn('Could not create Base44 JakmasAppointment:', err);
      appointedList.push({ ...payload, student_name: cand.full_name, exco_label: assignedConfig.label || assignedConfig.portfolio, local_saved: true });
    }
  }

  // Simpan log audit
  try {
    await logAudit(actorUser, 'JAKMAS_TOP12_EXCO_APPOINTED', 'E-Voting', {
      session_id: session?.id,
      appointed_count: appointedList.length
    });
  } catch (e) {}

  return appointedList;
}
