import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { connectToMongo, persistComplaints, persistUsers, syncSeedData } from './db';

dotenv.config({ path: ['.env.local', '.env'] });

const app = express();
const PORT = process.env.PORT || 3000;
let mongoEnabled = false;

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Database Models in memory with persistent seed data
export interface DbUser {
  id: string;
  name: string;
  emailOrMobile: string;
  passwordHash: string;
  role: 'nagrik' | 'department' | 'nagar_nigam' | 'admin';
  department?: 'sadak' | 'safai' | 'bijli' | 'jal';
  createdAt: string;
}

export interface DbComplaint {
  id: string;
  trackingId: string;
  citizenId: string;
  citizenName: string;
  citizenContact: string;
  title: string;
  description: string;
  hindiDraft: string;
  category: 'sadak' | 'safai' | 'bijli' | 'jal';
  photoUrl: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    landmark?: string;
    ward?: string;
  };
  aiAnalysis: {
    problemIdentified: string;
    detectedSeverity: 'kam' | 'madhyam' | 'gambhir' | 'turant';
    detectedCategory: 'sadak' | 'safai' | 'bijli' | 'jal';
    severityReason: string;
    aiEstimatedDays: number;
    aiEtaText: string;
  };
  priority: {
    severityPoints: number;
    weatherPoints: number;
    duplicatePoints: number;
    pendingDaysPoints: number;
    totalScore: number;
    level: 'kam' | 'madhyam' | 'gambhir' | 'turant';
    reason: string;
  };
  weather: {
    temp: number;
    precipitationNext48h: number;
    precipitationProbability: number;
    weatherCondition: string;
    rainAlert: boolean;
  };
  departmentEta?: string;
  departmentAssignedTo?: string;
  departmentNote?: string;
  status: 'darj' | 'kaam_chalu' | 'ho_gaya';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionPhotoUrl?: string;
  resolutionNote?: string;
  isLate: boolean;
  slaHours: number;
  hoursElapsed: number;
  isSampleData?: boolean;
}

// Seed Users
function requiredSeedPassword(variableName: string): string {
  const password = process.env[variableName];
  if (!password) {
    throw new Error(`${variableName} must be set in .env.local to initialize demo accounts.`);
  }
  return password;
}

const users: DbUser[] = [
  {
    id: 'user-nagrik-1',
    name: 'रमेश कुमार (नागरिक)',
    emailOrMobile: 'ramesh',
    passwordHash: requiredSeedPassword('DEMO_CITIZEN_PASSWORD'),
    role: 'nagrik',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-dept-sadak',
    name: 'सड़क विभाग',
    emailOrMobile: 'sadak',
    passwordHash: requiredSeedPassword('DEMO_ROADS_PASSWORD'),
    role: 'department',
    department: 'sadak',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-dept-safai',
    name: 'सफाई विभाग',
    emailOrMobile: 'safai',
    passwordHash: requiredSeedPassword('DEMO_SANITATION_PASSWORD'),
    role: 'department',
    department: 'safai',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-dept-bijli',
    name: 'बिजली विभाग',
    emailOrMobile: 'bijli',
    passwordHash: requiredSeedPassword('DEMO_ELECTRICITY_PASSWORD'),
    role: 'department',
    department: 'bijli',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-dept-jal',
    name: 'जल विभाग',
    emailOrMobile: 'jal',
    passwordHash: requiredSeedPassword('DEMO_WATER_PASSWORD'),
    role: 'department',
    department: 'jal',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-nigam-hq',
    name: 'नगर निगम HQ',
    emailOrMobile: 'nigam',
    passwordHash: requiredSeedPassword('DEMO_NIGAM_PASSWORD'),
    role: 'nagar_nigam',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-admin',
    name: 'मुख्य व्यवस्थापक',
    emailOrMobile: 'admin',
    passwordHash: requiredSeedPassword('DEMO_ADMIN_PASSWORD'),
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

// Base Coordinates: Central City Hub (e.g. Lucknow / Hazratganj zone 26.8467, 80.9462)
const complaints: DbComplaint[] = [
  {
    id: 'comp-seed-1',
    trackingId: 'NN-2026-8812',
    citizenId: 'user-nagrik-1',
    citizenName: 'रमेश कुमार',
    citizenContact: '+91 98765 43210 (ramesh@example.com)',
    title: 'मुख्य मार्ग पर गहरा गड्ढा - 2 दोपहिया वाहन गिर चुके हैं',
    description: 'हजरतगंज चौराहे के पास बीच सड़क पर करीब 2 फीट चौड़ा और 8 इंच गहरा गड्ढा है। बारिश में पानी भरने पर दिखाई नहीं देता।',
    hindiDraft: 'सेवा में, अधिशासी अभियंता (सड़क एवं PWD), नगर निगम। विषय: हजरतगंज चौराहे के निकट जानलेवा गड्ढे की तत्काल मरम्मत बाबत। महोदय, मुख्य सड़क पर अत्यंत गहरा गड्ढा होने से दुर्घटना का भारी अंदेशा है। कृपया तुरंत डामरीकरण करवाएं।',
    category: 'sadak',
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    location: {
      lat: 26.8524,
      lng: 80.9412,
      address: 'हजरतगंज मेन रोड, पिलर सं. 44 के सामने, वार्ड 12',
      landmark: 'हनुमान मंदिर के पास',
      ward: 'वार्ड 12 - हजरतगंज',
    },
    aiAnalysis: {
      problemIdentified: 'गहरा सड़क गड्ढा (Severe Asphalt Pothole)',
      detectedSeverity: 'turant',
      detectedCategory: 'sadak',
      severityReason: 'मुख्य यातायात मार्ग पर गहरा गड्ढा है। आगामी बारिश के पूर्वानुमान से पानी भरने पर दुर्घटना का अति-गंभीर जोखिम है।',
      aiEstimatedDays: 2,
      aiEtaText: 'AI का अंदाज़ा: 2 दिन (AI का अंदाज़ा, पक्का वादा नहीं)',
    },
    priority: {
      severityPoints: 65,
      weatherPoints: 25,
      duplicatePoints: 10,
      pendingDaysPoints: 15,
      totalScore: 115,
      level: 'turant',
      reason: 'गंभीर गड्ढा (65) + भारी बारिश चेतावनी (25) + क्लस्टर 2 शिकायतें (10) + 3 दिन लंबित (15)',
    },
    weather: {
      temp: 29,
      precipitationNext48h: 28.5,
      precipitationProbability: 85,
      weatherCondition: 'भारी बारिश की संभावना',
      rainAlert: true,
    },
    departmentEta: '2 दिन में (कार्य दल रवाना)',
    departmentAssignedTo: 'कनिष्ठ अभियंता वर्मा, टीम-B',
    departmentNote: 'गिट्टी और बिटुमिन मिक्सर ट्रक आवंटित कर दिया गया है।',
    status: 'kaam_chalu',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    isLate: true,
    slaHours: 48,
    hoursElapsed: 72,
    isSampleData: true,
  },
  {
    id: 'comp-seed-2',
    trackingId: 'NN-2026-8815',
    citizenId: 'user-nagrik-2',
    citizenName: 'सुनीता शर्मा',
    citizenContact: '+91 94150 11223 (sunita.sharma@domain.in)',
    title: 'आवासीय क्षेत्र में खुला नाला और कचरे का भराव',
    description: 'वार्ड 18 गोमती नगर में खुला नाला ओवरफ्लो हो रहा है, बदबू फैल रही है और संक्रामक बीमारियों का खतरा है।',
    hindiDraft: 'सेवा में, नगर स्वास्थ्य अधिकारी / जल निकासी विभाग, नगर निगम। विषय: गोमती नगर ब्लॉक C में नाले की तत्काल गाद सफाई व जल निकासी बाबत। महोदय, नाला चोक होने से गंदा पानी सड़क पर आ रहा है। कृपया जेटिंग मशीन से सफाई करवाएं।',
    category: 'jal',
    photoUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=600&q=80',
    location: {
      lat: 26.8580,
      lng: 80.9980,
      address: 'गोमती नगर, पत्रकार पुरम मार्केट के पीछे, वार्ड 18',
      landmark: 'पार्क गेट नंबर 2',
      ward: 'वार्ड 18 - गोमती नगर',
    },
    aiAnalysis: {
      problemIdentified: 'खुला चोक नाला व जलभराव (Blocked Drainage Overflow)',
      detectedSeverity: 'gambhir',
      detectedCategory: 'jal',
      severityReason: 'आगामी 48 घंटे में बारिश होने पर गंदा पानी घरों में घुसने का अंदेशा।',
      aiEstimatedDays: 2,
      aiEtaText: 'AI का अंदाज़ा: 2 दिन (AI का अंदाज़ा, पक्का वादा नहीं)',
    },
    priority: {
      severityPoints: 45,
      weatherPoints: 25,
      duplicatePoints: 20,
      pendingDaysPoints: 10,
      totalScore: 100,
      level: 'turant',
      reason: 'जलभराव जोखिम (45) + बारिश अलर्ट (25) + 3 डुप्लीकेट रिपोर्ट (20) + लंबित (10)',
    },
    weather: {
      temp: 28,
      precipitationNext48h: 32.0,
      precipitationProbability: 90,
      weatherCondition: 'भारी वर्षा पूर्वानुमान',
      rainAlert: true,
    },
    status: 'darj',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    isLate: true,
    slaHours: 36,
    hoursElapsed: 48,
    isSampleData: true,
  },
  {
    id: 'comp-seed-3',
    trackingId: 'NN-2026-8820',
    citizenId: 'user-nagrik-3',
    citizenName: 'अब्दुल कलाम',
    citizenContact: '+91 91234 56789',
    title: 'स्ट्रीट लाइट खंभे से खुला लटकता तार - करंट का खतरा',
    description: 'चारबाग स्टेशन रोड पर बिजली पोल संख्या 19 से नंगा तार जमीन से 4 फीट ऊपर झूल रहा है। बच्चों और राहगीरों के लिए जानलेवा है।',
    hindiDraft: 'सेवा में, सहायक अधिशासी अभियंता (मार्ग प्रकाश/विद्युत विभाग)। विषय: चारबाग रोड पर विद्युत पोल से लटकते नंगे तार की तत्काल मरम्मत बाबत। महोदय, किसी भी समय भीषण करंट की दुर्घटना हो सकती है। अविलंब लाइनमैन भेजें।',
    category: 'bijli',
    photoUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80',
    location: {
      lat: 26.8320,
      lng: 80.9190,
      address: 'चारबाग रेलवे स्टेशन मार्ग, पोल संख्या 19',
      landmark: 'बस स्टैंड के पास',
      ward: 'वार्ड 07 - चारबाग',
    },
    aiAnalysis: {
      problemIdentified: 'खुला विद्युत तार (Hanging Live Electric Wire)',
      detectedSeverity: 'turant',
      detectedCategory: 'bijli',
      severityReason: 'जमीन के बेहद करीब नंगा तार होने से घातक विद्युत आघात (Electrocution) का तत्काल खतरा।',
      aiEstimatedDays: 1,
      aiEtaText: 'AI का अंदाज़ा: 24 घंटे (AI का अंदाज़ा, पक्का वादा नहीं)',
    },
    priority: {
      severityPoints: 65,
      weatherPoints: 20,
      duplicatePoints: 0,
      pendingDaysPoints: 5,
      totalScore: 90,
      level: 'turant',
      reason: 'अति-गंभीर सुरक्षा खतरा (65) + सीलन/बारिश में करंट रिस्क (20) + 1 दिन (5)',
    },
    weather: {
      temp: 30,
      precipitationNext48h: 18.0,
      precipitationProbability: 75,
      weatherCondition: 'मेघगर्जन एवं बूंदाबांदी',
      rainAlert: true,
    },
    departmentEta: 'आज शाम 6 बजे तक',
    departmentAssignedTo: 'इलेक्ट्रिशियन टीम-4',
    departmentNote: 'शटडाउन लेकर केबल इन्सुलेशन और बॉक्स रिप्लेसमेंट कार्य प्रगति पर है।',
    status: 'kaam_chalu',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    isLate: false,
    slaHours: 24,
    hoursElapsed: 22,
    isSampleData: true,
  },
  {
    id: 'comp-seed-4',
    trackingId: 'NN-2026-8824',
    citizenId: 'user-nagrik-4',
    citizenName: 'प्रियंका राय',
    citizenContact: '+91 97890 12345',
    title: 'सार्वजनिक डस्टबिन ओवरफ्लो एवं सड़क पर कूड़े का ढेर',
    description: 'आलमबाग कम्युनिटी सेंटर के पास 4 दिनों से कचरा गाड़ी नहीं आई है। कूड़ा सड़क पर बिखर गया है और आवारा पशु जमा हो रहे हैं।',
    hindiDraft: 'सेवा में, क्षेत्रीय सफाई निरीक्षक (स्वच्छता विंग), नगर निगम। विषय: आलमबाग में डंपर कचरा उठाने बाबत। महोदय, दुर्गंध और संक्रामक रोग का खतरा बढ़ रहा है। कृपया आज ही कचरा उठवाकर कीटनाशक छिड़काव कराएं।',
    category: 'safai',
    photoUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    location: {
      lat: 26.8190,
      lng: 80.9020,
      address: 'आलमबाग मार्केट, कम्युनिटी सेंटर के सामने',
      landmark: 'बैंक ऑफ बड़ौदा के पास',
      ward: 'वार्ड 23 - आलमबाग',
    },
    aiAnalysis: {
      problemIdentified: 'अनियंत्रित कचरा ढेर (Overflowing Waste Dump)',
      detectedSeverity: 'madhyam',
      detectedCategory: 'safai',
      severityReason: 'सफाई न होने से सार्वजनिक स्वास्थ्य व मक्खियों का प्रकोप। बारिश में कचरा बहकर नालियों में जा सकता है।',
      aiEstimatedDays: 1,
      aiEtaText: 'AI का अंदाज़ा: 1 दिन (AI का अंदाज़ा, पक्का वादा नहीं)',
    },
    priority: {
      severityPoints: 25,
      weatherPoints: 15,
      duplicatePoints: 10,
      pendingDaysPoints: 20,
      totalScore: 70,
      level: 'gambhir',
      reason: 'मध्यम स्वच्छता समस्या (25) + बारिश जोखिम (15) + क्लस्टर (10) + 4 दिन पुराना (20)',
    },
    weather: {
      temp: 31,
      precipitationNext48h: 12.0,
      precipitationProbability: 60,
      weatherCondition: 'हल्की बारिश',
      rainAlert: true,
    },
    status: 'darj',
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    isLate: true,
    slaHours: 24,
    hoursElapsed: 96,
    isSampleData: true,
  },
  {
    id: 'comp-seed-5',
    trackingId: 'NN-2026-8801',
    citizenId: 'user-nagrik-1',
    citizenName: 'रमेश कुमार',
    citizenContact: '+91 98765 43210 (ramesh@example.com)',
    title: 'पेयजल पाइपलाइन लीकेज - साफ पानी व्यर्थ बह रहा था',
    description: 'वार्ड 12 मेन रोड पर पेयजल आपूर्ति की मुख्य पाइप में लीकेज था। पानी सड़क पर जमा हो रहा था।',
    hindiDraft: 'सेवा में, जलकल अभियंता, नगर निगम। पेयजल लीकेज दुरुस्त करने बाबत।',
    category: 'jal',
    photoUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80',
    location: {
      lat: 26.8480,
      lng: 80.9490,
      address: 'अशोक मार्ग, सिविल लाइंस, वार्ड 12',
      landmark: 'पोस्ट ऑफिस के सामने',
      ward: 'वार्ड 12 - सिविल लाइंस',
    },
    aiAnalysis: {
      problemIdentified: 'जल आपूर्ति पाइपलाइन लीकेज (Clean Water Pipe Leak)',
      detectedSeverity: 'madhyam',
      detectedCategory: 'jal',
      severityReason: 'शुद्ध पेयजल की बर्बादी एवं सड़क पर दबाव।',
      aiEstimatedDays: 1,
      aiEtaText: 'AI का अंदाज़ा: 1 दिन (AI का अंदाज़ा, पक्का वादा नहीं)',
    },
    priority: {
      severityPoints: 25,
      weatherPoints: 0,
      duplicatePoints: 0,
      pendingDaysPoints: 5,
      totalScore: 30,
      level: 'kam',
      reason: 'सामान्य लीकेज (25) + सामान्य मौसम (0) + 1 दिन (5)',
    },
    weather: {
      temp: 29,
      precipitationNext48h: 2.0,
      precipitationProbability: 15,
      weatherCondition: 'धूप / सामान्य',
      rainAlert: false,
    },
    departmentEta: '1 दिन में पूर्ण किया गया',
    departmentAssignedTo: 'प्लम्बर यूनिट 2',
    departmentNote: 'पाइप क्लैंपिंग एवं सीमेंट सीलिंग कार्य संपन्न। पानी की आपूर्ति बहाल।',
    status: 'ho_gaya',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    resolutionPhotoUrl: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80',
    resolutionNote: 'सड़क की सतह को ठीक करके नया सीमेंट वाल्व बॉक्स लगा दिया गया है। नागरिक संतुष्टि दर्ज।',
    isLate: false,
    slaHours: 48,
    hoursElapsed: 36,
    isSampleData: true,
  },
];

// Weather Priority calculation helper
async function calculateWeatherPriority(category: string, lat: number, lng: number) {
  let weatherData = {
    temp: 30,
    precipitationNext48h: 0,
    precipitationProbability: 20,
    weatherCondition: 'सामान्य (Clear/Partly Cloudy)',
    rainAlert: false,
  };

  try {
    // Call real Open-Meteo API
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data.daily && data.daily.precipitation_sum) {
        const rainDay1 = data.daily.precipitation_sum[0] || 0;
        const rainDay2 = data.daily.precipitation_sum[1] || 0;
        const totalRain48h = Math.round((rainDay1 + rainDay2) * 10) / 10;
        const prob = data.daily.precipitation_probability_max?.[0] || 0;
        const temp = data.daily.temperature_2m_max?.[0] || 30;

        const isHeavyRain = totalRain48h > 5 || prob >= 65;
        weatherData = {
          temp: Math.round(temp),
          precipitationNext48h: totalRain48h,
          precipitationProbability: prob,
          weatherCondition: isHeavyRain ? `बारिश चेतावनी (${totalRain48h}mm, ${prob}% सम्भावना)` : `सामान्य धूप/बादल (${temp}°C)`,
          rainAlert: isHeavyRain,
        };
      }
    }
  } catch (err) {
    console.warn('Weather fetch fallback to default:', (err as Error).message);
  }

  // Weight Calculation:
  // If next 2 days rain is high and category is drainage/pothole/waterlogging:
  let weatherPoints = 0;
  if (weatherData.rainAlert) {
    if (category === 'jal' || category === 'sadak') {
      weatherPoints = 25; // High vulnerability in rain
    } else if (category === 'bijli') {
      weatherPoints = 20; // Short circuit / electrocution vulnerability
    } else {
      weatherPoints = 15; // Garbage overflow in rain
    }
  } else if (weatherData.precipitationNext48h > 2) {
    weatherPoints = 10;
  }

  return { weatherData, weatherPoints };
}

// Authentication Middleware Simulator
function getUserFromToken(req: Request): DbUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  return users.find((u) => u.id === token) || null;
}

// ----------------- API ROUTES -----------------

// 1. Auth: Sign Up (Nagrik)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, emailOrMobile, password } = req.body;
  if (!name || !emailOrMobile || !password) {
    return res.status(400).json({ error: 'नाम, मोबाइल/ईमेल और पासवर्ड आवश्यक हैं।' });
  }

  const existing = users.find((u) => u.emailOrMobile.toLowerCase() === emailOrMobile.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'यह ईमेल/मोबाइल पहले से पंजीकृत है।' });
  }

  const newUser: DbUser = {
    id: `user-nagrik-${Date.now()}`,
    name,
    emailOrMobile,
    passwordHash: password, // In production bcrypt hash; for fast demo demo-password storage
    role: 'nagrik',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);

  if (mongoEnabled) {
    await persistUsers(users);
  }

  res.json({
    token: newUser.id,
    user: {
      id: newUser.id,
      name: newUser.name,
      emailOrMobile: newUser.emailOrMobile,
      role: newUser.role,
    },
  });
});

// 2. Auth: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { emailOrMobile, password } = req.body;
  if (!emailOrMobile || !password) {
    return res.status(400).json({ error: 'आईडी और पासवर्ड दर्ज करें।' });
  }

  const user = users.find(
    (u) =>
      u.emailOrMobile.toLowerCase() === emailOrMobile.toLowerCase().trim() &&
      u.passwordHash === password.trim()
  );

  if (!user) {
    return res.status(401).json({ error: 'अमान्य क्रेडेंशियल! कृपया सही आईडी और पासवर्ड दर्ज करें।' });
  }

  res.json({
    token: user.id,
    user: {
      id: user.id,
      name: user.name,
      emailOrMobile: user.emailOrMobile,
      role: user.role,
      department: user.department,
    },
  });
});

// Quick Seed Users info endpoint for effortless reviewer login
app.get('/api/auth/demo-accounts', (req: Request, res: Response) => {
  const user = getUserFromToken(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'केवल मुख्य व्यवस्थापक यह जानकारी देख सकता है।' });
  }

  res.json({
    accounts: users.map((u) => ({
      id: u.id,
      name: u.name,
      emailOrMobile: u.emailOrMobile,
      passwordHash: u.passwordHash,
      role: u.role,
      department: u.department,
    })),
  });
});

app.get('/api/admin/users', (req: Request, res: Response) => {
  const user = getUserFromToken(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'केवल मुख्य व्यवस्थापक उपयोगकर्ता डेटा प्रबंधित कर सकता है।' });
  }

  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      emailOrMobile: u.emailOrMobile,
      password: u.passwordHash,
      role: u.role,
      department: u.department,
      createdAt: u.createdAt,
    })),
  });
});

app.patch('/api/admin/users/:id', async (req: Request, res: Response) => {
  const admin = getUserFromToken(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'केवल मुख्य व्यवस्थापक उपयोगकर्ता अपडेट कर सकता है।' });
  }

  const { id } = req.params;
  const target = users.find((u) => u.id === id);
  if (!target) {
    return res.status(404).json({ error: 'उपयोगकर्ता नहीं मिला।' });
  }

  const { name, emailOrMobile, password, role, department } = req.body || {};

  if (name) target.name = name;
  if (emailOrMobile) target.emailOrMobile = emailOrMobile;
  if (password) target.passwordHash = password;
  if (role) target.role = role;
  if (department !== undefined) {
    target.department = department || undefined;
  }

  if (role === 'department' && !target.department) {
    target.department = 'sadak';
  }

  if (role !== 'department') {
    target.department = undefined;
  }

  if (mongoEnabled) {
    await persistUsers(users);
  }

  res.json({
    message: 'उपयोगकर्ता जानकारी अपडेट हो गई है।',
    user: {
      id: target.id,
      name: target.name,
      emailOrMobile: target.emailOrMobile,
      password: target.passwordHash,
      role: target.role,
      department: target.department,
    },
  });
});

// 3. AI Vision Diagnosis
app.post('/api/ai/diagnose', async (req: Request, res: Response) => {
  try {
    const { imageBase64, userNotes, lat, lng } = req.body;
    if (!geminiApiKey) {
      return res.status(503).json({ error: 'Gemini API key configure नहीं है। कृपया .env.local में GEMINI_API_KEY सेट करके सर्वर restart करें।' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'फोटो प्रदान नहीं की गई।' });
    }

    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) {
      return res.status(400).json({ error: 'फोटो सही image format में नहीं मिली। कृपया फोटो दोबारा चुनें।' });
    }
    const mimeType = match[1];
    const cleanBase64 = match[2];

    const prompt = `You are the Civic Issue Diagnostic Engine for Municipal Corporations in India (Nagar Nigam / PWD).
Analyze this uploaded citizen civic issue photograph. Identify:
1. problemTitle: A concise Hindi title for the issue (e.g. "मुख्य मार्ग पर गहरा सड़क गड्ढा" or "खुला सीवर नाला एवं बदबू" or "लटकता बिजली तार" or "कचरे का ढेर").
2. category: Strictly one of ["sadak", "safai", "bijli", "jal"].
   - "sadak": Potholes, broken roads, damaged footpaths, speed breakers.
   - "safai": Garbage heaps, dead animals, overflowing dustbins, litter.
   - "bijli": Loose live wires, broken streetlights, transformer spark, leaning electric poles.
   - "jal": Blocked drains, sewer overflows, drinking water pipe leaks, contaminated water.
3. severity: Strictly one of ["kam", "madhyam", "gambhir", "turant"].
   - "turant": Immediate life safety hazard, live electric wire, very deep accident-causing pothole, flooded main road.
   - "gambhir": Significant disruption, major drain overflow, large garbage dump.
   - "madhyam": Moderate issue, regular pothole, uncollected bin.
   - "kam": Minor scratch, small trash, cosmetic issue.
4. severityReason: In Hindi, 1-2 clear sentences explaining why this severity was assigned.
5. hindiDraft: A formal, respectful Hindi draft petition for Nagar Nigam with subject (विषय), context, and urgent action request.
6. aiEstimatedDays: Recommended SLA resolution days (integer 1, 2, 3, or 5).
7. safetyRisk: One of ["अति उच्च (Critical)", "उच्च (High)", "मध्यम (Medium)", "सामान्य (Low)"].

Citizen notes provided: "${userNotes || 'None'}".
Output strictly valid JSON with these exact keys.`;

    let aiResult;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini ने खाली उत्तर दिया।');
      }

      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Gemini ने अपेक्षित JSON उत्तर नहीं दिया।');
      }
      const result = parsed as Record<string, unknown>;
      const validCategories = ['sadak', 'safai', 'bijli', 'jal'] as const;
      const validSeverities = ['kam', 'madhyam', 'gambhir', 'turant'] as const;
      if (
        typeof result.problemTitle !== 'string' ||
        !validCategories.includes(result.category as (typeof validCategories)[number]) ||
        !validSeverities.includes(result.severity as (typeof validSeverities)[number]) ||
        typeof result.severityReason !== 'string' ||
        typeof result.hindiDraft !== 'string'
      ) {
        throw new Error('Gemini के उत्तर में जरूरी diagnosis fields नहीं हैं।');
      }

      const days = Number(result.aiEstimatedDays);
      aiResult = {
        problemTitle: result.problemTitle,
        category: result.category as 'sadak' | 'safai' | 'bijli' | 'jal',
        severity: result.severity as 'kam' | 'madhyam' | 'gambhir' | 'turant',
        severityReason: result.severityReason,
        hindiDraft: result.hindiDraft,
        aiEstimatedDays: Number.isInteger(days) && days > 0 ? days : 2,
        aiEtaText: `AI का अंदाज़ा: ${Number.isInteger(days) && days > 0 ? days : 2} दिन (AI का अंदाज़ा, पक्का वादा नहीं)`,
        safetyRisk: typeof result.safetyRisk === 'string' ? result.safetyRisk : 'उच्च (High)',
      };
    } catch (geminiErr) {
      console.error('Gemini vision diagnosis failed:', geminiErr);
      return res.status(502).json({ error: 'Gemini AI से फोटो का विश्लेषण नहीं हो पाया। API key, उपलब्ध model और server logs जाँचें, फिर दोबारा प्रयास करें।' });
    }

    // Weather Priority Boost
    const latitude = lat || 26.8467;
    const longitude = lng || 80.9462;
    const { weatherData, weatherPoints } = await calculateWeatherPriority(aiResult.category, latitude, longitude);

    // Calculate score
    const sevScores = { kam: 10, madhyam: 25, gambhir: 45, turant: 65 };
    const sevPoints = sevScores[aiResult.severity];
    const totalScore = sevPoints + weatherPoints;

    let finalLevel: 'kam' | 'madhyam' | 'gambhir' | 'turant' = aiResult.severity;
    if (totalScore >= 85) finalLevel = 'turant';
    else if (totalScore >= 60) finalLevel = 'gambhir';
    else if (totalScore >= 35) finalLevel = 'madhyam';
    else finalLevel = 'kam';

    res.json({
      aiAnalysis: aiResult,
      weather: weatherData,
      priority: {
        severityPoints: sevPoints,
        weatherPoints: weatherPoints,
        duplicatePoints: 0,
        pendingDaysPoints: 0,
        totalScore,
        level: finalLevel,
        reason: `AI गंभीरता (${sevPoints} अंक) + ${weatherData.rainAlert ? `मौसम बारिश प्रभाव (+${weatherPoints} अंक)` : 'सामान्य मौसम (0 अंक)'}`,
      },
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ error: 'AI डायग्नोसिस में त्रुटि हुई। कृपया पुनः प्रयास करें।' });
  }
});

// 4. GET Complaints - WITH STRICT PRIVACY CONTROLS!
// "Department aur Nagar Nigam ke API response mein nagrik ka naam, mobile, email hota hi nahi. Ye sirf screen se chhupana nahi hai, server se hi nahi jaata."
app.get('/api/complaints', (req: Request, res: Response) => {
  const user = getUserFromToken(req);

  // If no auth token, reject
  if (!user) {
    return res.status(401).json({ error: 'लॉगिन आवश्यक है।' });
  }

  // Update hoursElapsed & isLate dynamically based on current time
  const now = Date.now();
  complaints.forEach((c) => {
    const elapsed = Math.round((now - new Date(c.createdAt).getTime()) / (3600 * 1000));
    c.hoursElapsed = elapsed;
    if (c.status !== 'ho_gaya' && elapsed > c.slaHours) {
      c.isLate = true;
    }
  });

  // Filter complaints according to role
  let filteredComplaints: DbComplaint[] = [];

  if (user.role === 'nagrik') {
    // Citizen sees ONLY their own complaints
    filteredComplaints = complaints.filter((c) => c.citizenId === user.id);
  } else if (user.role === 'department') {
    // Department sees ONLY complaints of their own department
    filteredComplaints = complaints.filter((c) => c.category === user.department);
  } else if (user.role === 'nagar_nigam') {
    // Nagar Nigam sees ALL complaints across departments
    filteredComplaints = [...complaints];
  } else if (user.role === 'admin') {
    // Admin sees all complaints
    filteredComplaints = [...complaints];
  }

  // PRIVACY SANITIZATION:
  // If role is 'department' or 'nagar_nigam', STRIP CITIZEN IDENTITY AT SERVER LEVEL
  const sanitized = filteredComplaints.map((item) => {
    const clone = { ...item };
    if (user.role === 'department' || user.role === 'nagar_nigam') {
      // Stripped completely from API payload!
      delete (clone as any).citizenId;
      delete (clone as any).citizenName;
      delete (clone as any).citizenContact;
    }
    return clone;
  });

  // Sort by priority totalScore descending
  sanitized.sort((a, b) => b.priority.totalScore - a.priority.totalScore);

  res.json({ complaints: sanitized });
});

// 5. POST Complaint (Citizen creates new complaint)
app.post('/api/complaints', async (req: Request, res: Response) => {
  const user = getUserFromToken(req);
  if (!user || user.role !== 'nagrik') {
    return res.status(403).json({ error: 'केवल नागरिक शिकायत दर्ज कर सकते हैं।' });
  }

  const {
    title,
    description,
    hindiDraft,
    category,
    photoUrl,
    location,
    aiAnalysis,
    priority,
    weather,
  } = req.body;

  if (!title || !category || !photoUrl || !location) {
    return res.status(400).json({ error: 'शिकायत का शीर्षक, विभाग, फोटो एवं स्थान आवश्यक हैं।' });
  }

  // Count nearby duplicates in same ward or ~500m
  const duplicates = complaints.filter(
    (c) =>
      c.category === category &&
      Math.abs(c.location.lat - location.lat) < 0.005 &&
      Math.abs(c.location.lng - location.lng) < 0.005 &&
      c.status !== 'ho_gaya'
  );

  const duplicatePoints = Math.min(30, duplicates.length * 10);
  const totalScore = (priority?.severityPoints || 45) + (priority?.weatherPoints || 0) + duplicatePoints;

  let finalLevel: 'kam' | 'madhyam' | 'gambhir' | 'turant' = priority?.level || 'madhyam';
  if (totalScore >= 85) finalLevel = 'turant';
  else if (totalScore >= 60) finalLevel = 'gambhir';
  else if (totalScore >= 35) finalLevel = 'madhyam';
  else finalLevel = 'kam';

  const newId = `comp-${Date.now()}`;
  const trackingNumber = `NN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newComplaint: DbComplaint = {
    id: newId,
    trackingId: trackingNumber,
    citizenId: user.id,
    citizenName: user.name,
    citizenContact: user.emailOrMobile,
    title,
    description: description || title,
    hindiDraft: hindiDraft || title,
    category: category,
    photoUrl,
    location: {
      lat: location.lat || 26.8467,
      lng: location.lng || 80.9462,
      address: location.address || 'नागरिक द्वारा दर्ज पता',
      landmark: location.landmark || '',
      ward: location.ward || 'वार्ड 12',
    },
    aiAnalysis: aiAnalysis || {
      problemIdentified: title,
      detectedSeverity: finalLevel,
      detectedCategory: category,
      severityReason: 'नागरिक द्वारा फोटो आधारित दर्ज समस्या।',
      aiEstimatedDays: 2,
      aiEtaText: 'AI का अंदाज़ा: 2 दिन (AI का अंदाज़ा, पक्का वादा नहीं)',
    },
    priority: {
      severityPoints: priority?.severityPoints || 45,
      weatherPoints: priority?.weatherPoints || 0,
      duplicatePoints,
      pendingDaysPoints: 0,
      totalScore,
      level: finalLevel,
      reason: `गंभीरता (${priority?.severityPoints || 45}) + मौसम (${priority?.weatherPoints || 0}) + इसी क्षेत्र की रिपोर्ट (${duplicatePoints})`,
    },
    weather: weather || {
      temp: 30,
      precipitationNext48h: 0,
      precipitationProbability: 10,
      weatherCondition: 'सामान्य',
      rainAlert: false,
    },
    status: 'darj',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isLate: false,
    slaHours: finalLevel === 'turant' ? 24 : finalLevel === 'gambhir' ? 48 : 72,
    hoursElapsed: 0,
    isSampleData: false,
  };

  complaints.unshift(newComplaint);

  if (mongoEnabled) {
    await persistComplaints(complaints);
  }

  res.status(201).json({
    complaint: newComplaint,
    message: `आपकी शिकायत संख्या ${newComplaint.trackingId} सफलतापूर्वक दर्ज हो गई है।`,
  });
});

// 6. PATCH Complaint Status & Department ETA Update
app.patch('/api/complaints/:id/status', async (req: Request, res: Response) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'लॉगिन आवश्यक है।' });
  }

  const { id } = req.params;
  const complaint = complaints.find((c) => c.id === id);
  if (!complaint) {
    return res.status(404).json({ error: 'शिकायत नहीं मिली।' });
  }

  // Check authorization: Admin can update any; Department can update only their department
  if (user.role === 'department' && complaint.category !== user.department) {
    return res.status(403).json({ error: 'आप केवल अपने विभाग की शिकायत पर कार्रवाई कर सकते हैं।' });
  }
  if (user.role === 'nagrik') {
    return res.status(403).json({ error: 'नागरिक शिकायत की स्थिति नहीं बदल सकते।' });
  }

  const { status, departmentEta, departmentNote, resolutionPhotoUrl, resolutionNote } = req.body;

  if (status === 'ho_gaya') {
    if (typeof resolutionPhotoUrl !== 'string' || !resolutionPhotoUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'शिकायत पूरी करने के लिए समाधान की फोटो अपलोड करना जरूरी है।' });
    }
    if (resolutionPhotoUrl.length > 22 * 1024 * 1024) {
      return res.status(413).json({ error: 'समाधान फोटो बहुत बड़ी है। कृपया 16 MB से छोटी फोटो अपलोड करें।' });
    }
    if (!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(resolutionPhotoUrl)) {
      return res.status(400).json({ error: 'समाधान फोटो का format मान्य नहीं है। कृपया image दोबारा अपलोड करें।' });
    }
  }

  if (status) {
    complaint.status = status;
    if (status === 'ho_gaya') {
      complaint.resolvedAt = new Date().toISOString();
      complaint.resolutionPhotoUrl = resolutionPhotoUrl;
      if (resolutionNote) complaint.resolutionNote = resolutionNote;
    }
  }

  if (departmentEta !== undefined) {
    complaint.departmentEta = departmentEta;
  }

  if (departmentNote !== undefined) {
    complaint.departmentNote = departmentNote;
    complaint.departmentAssignedTo = `${user.name}`;
  }

  complaint.updatedAt = new Date().toISOString();

  if (mongoEnabled) {
    await persistComplaints(complaints);
  }

  res.json({
    message: 'शिकायत की स्थिति एवं समय सीमा सफलतापूर्वक अपडेट कर दी गई है।',
    complaint,
  });
});

// 7. Municipal Corporation Analytics (Nagar Nigam Dashboard)
app.get('/api/analytics/summary', (req: Request, res: Response) => {
  const user = getUserFromToken(req);
  if (!user || (user.role !== 'nagar_nigam' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'केवल नगर निगम या व्यवस्थापक इस रिपोर्ट को देख सकते हैं।' });
  }

  const deptMap: Record<string, { total: number; pending: number; inProgress: number; resolved: number; late: number; critical: number }> = {
    sadak: { total: 0, pending: 0, inProgress: 0, resolved: 0, late: 0, critical: 0 },
    safai: { total: 0, pending: 0, inProgress: 0, resolved: 0, late: 0, critical: 0 },
    bijli: { total: 0, pending: 0, inProgress: 0, resolved: 0, late: 0, critical: 0 },
    jal: { total: 0, pending: 0, inProgress: 0, resolved: 0, late: 0, critical: 0 },
  };

  complaints.forEach((c) => {
    const d = deptMap[c.category] || deptMap['sadak'];
    d.total++;
    if (c.status === 'darj') d.pending++;
    if (c.status === 'kaam_chalu') d.inProgress++;
    if (c.status === 'ho_gaya') d.resolved++;
    if (c.isLate && c.status !== 'ho_gaya') d.late++;
    if (c.priority.level === 'turant') d.critical++;
  });

  const departmentStats = [
    { department: 'sadak', nameHindi: 'सड़क एवं PWD', ...deptMap.sadak },
    { department: 'safai', nameHindi: 'सफाई एवं कचरा प्रबंधन', ...deptMap.safai },
    { department: 'bijli', nameHindi: 'विद्युत एवं स्ट्रीट लाइट', ...deptMap.bijli },
    { department: 'jal', nameHindi: 'जल संस्थान व ड्रेनेज', ...deptMap.jal },
  ];

  const totalComplaints = complaints.length;
  const totalResolved = complaints.filter((c) => c.status === 'ho_gaya').length;
  const totalLate = complaints.filter((c) => c.isLate && c.status !== 'ho_gaya').length;
  const totalCritical = complaints.filter((c) => c.priority.level === 'turant' && c.status !== 'ho_gaya').length;

  res.json({
    totalComplaints,
    totalResolved,
    totalLate,
    totalCritical,
    departmentStats,
    sampleDataNote: 'हॉटस्पॉट मानचित्र एवं वार्ड क्लस्टर में कुछ सिमुलेटेड नमूना डेटा (Sample Data) प्रदर्शित है।',
  });
});

// Setup Vite middleware for fullstack SPA
async function setupServer() {
  mongoEnabled = await connectToMongo();
  if (mongoEnabled) {
    await syncSeedData(users, complaints);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`SmartNagar Civic Portal server is running on http://localhost:${PORT}`);
  });
}

setupServer();
