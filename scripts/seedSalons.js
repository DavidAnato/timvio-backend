/**
 * Seed complet TimVio — salons, clients, RDV, avis
 * Usage: pnpm seed          (ajoute sans supprimer)
 *        pnpm seed:fresh     (réinitialise les données démo)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDatabase, mongoose } = require('../config/database');
const User = require('../models/User');
const Service = require('../models/Service');
const Professional = require('../models/Professional');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const { Availability } = require('../models/Availability');

const SALON_PASSWORD = 'Salon123!';
const CLIENT_PASSWORD = 'Client123!';
const FRESH = process.argv.includes('--fresh');

const DEFAULT_AVAILABILITY = [
  { dayOfWeek: 1, isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00' }] },
  { dayOfWeek: 2, isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00' }] },
  { dayOfWeek: 3, isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00' }] },
  { dayOfWeek: 4, isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00' }] },
  { dayOfWeek: 5, isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00' }] },
  { dayOfWeek: 6, isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '17:00' }] },
  { dayOfWeek: 0, isAvailable: false, timeSlots: [] },
];

const CITIES = [
  { city: 'Paris', postal: '75001', lng: 2.3522, lat: 48.8566 },
  { city: 'Paris', postal: '75011', lng: 2.3794, lat: 48.8575 },
  { city: 'Paris', postal: '75015', lng: 2.3000, lat: 48.8422 },
  { city: 'Lyon', postal: '69001', lng: 4.8357, lat: 45.7640 },
  { city: 'Lyon', postal: '69002', lng: 4.8280, lat: 45.7580 },
  { city: 'Lyon', postal: '69003', lng: 4.8510, lat: 45.7600 },
  { city: 'Marseille', postal: '13001', lng: 5.3698, lat: 43.2965 },
  { city: 'Marseille', postal: '13006', lng: 5.3800, lat: 43.2850 },
  { city: 'Marseille', postal: '13008', lng: 5.3950, lat: 43.2700 },
  { city: 'Bordeaux', postal: '33000', lng: -0.5792, lat: 44.8378 },
  { city: 'Bordeaux', postal: '33100', lng: -0.5500, lat: 44.8300 },
  { city: 'Toulouse', postal: '31000', lng: 1.4442, lat: 43.6047 },
  { city: 'Toulouse', postal: '31500', lng: 1.4700, lat: 43.5900 },
  { city: 'Lille', postal: '59000', lng: 3.0573, lat: 50.6292 },
  { city: 'Lille', postal: '59800', lng: 3.0700, lat: 50.6350 },
  { city: 'Nantes', postal: '44000', lng: -1.5534, lat: 47.2184 },
  { city: 'Nice', postal: '06000', lng: 7.2619, lat: 43.7102 },
  { city: 'Strasbourg', postal: '67000', lng: 7.7521, lat: 48.5734 },
  { city: 'Montpellier', postal: '34000', lng: 3.8767, lat: 43.6108 },
  { city: 'Rennes', postal: '35000', lng: -1.6778, lat: 48.1173 },
];

const SALON_PREFIXES = [
  { prefix: 'Atelier', speciality: 'Coiffure' },
  { prefix: 'Studio', speciality: 'Coiffure' },
  { prefix: 'Institut', speciality: 'Esthétique' },
  { prefix: 'Spa', speciality: 'Spa' },
  { prefix: 'Barber', speciality: 'Barbier' },
  { prefix: 'Nails', speciality: 'Onglerie' },
];

const SERVICE_TEMPLATES = [
  { name: 'Coupe femme', duration: 45, price: 38, category: 'femme' },
  { name: 'Coupe homme', duration: 30, price: 24, category: 'homme' },
  { name: 'Brushing', duration: 30, price: 28, category: 'femme' },
  { name: 'Coloration', duration: 90, price: 72, category: 'femme' },
  { name: 'Balayage', duration: 120, price: 95, category: 'femme' },
  { name: 'Manucure', duration: 45, price: 32, category: 'femme' },
  { name: 'Soin visage', duration: 60, price: 55, category: 'femme' },
  { name: 'Barbe', duration: 25, price: 18, category: 'homme' },
];

const CLIENT_NAMES = [
  ['Marie', 'Dupont'], ['Thomas', 'Martin'], ['Sophie', 'Bernard'], ['Lucas', 'Petit'],
  ['Emma', 'Robert'], ['Hugo', 'Richard'], ['Léa', 'Durand'], ['Nathan', 'Moreau'],
  ['Chloé', 'Simon'], ['Louis', 'Laurent'], ['Camille', 'Lefebvre'], ['Jules', 'Michel'],
  ['Manon', 'Garcia'], ['Arthur', 'David'], ['Sarah', 'Bertrand'], ['Ethan', 'Roux'],
  ['Inès', 'Vincent'], ['Gabriel', 'Fournier'], ['Juliette', 'Girard'], ['Raphaël', 'Bonnet'],
  ['Clara', 'Dupuis'], ['Adam', 'Lambert'], ['Zoé', 'Fontaine'], ['Paul', 'Rousseau'],
  ['Eva', 'Blanc'], ['Maxime', 'Guerin'], ['Lina', 'Muller'], ['Noah', 'Henry'],
  ['Alice', 'Roussel'], ['Tom', 'Nicolas'],
];

const REVIEW_COMMENTS = [
  'Excellent salon, très professionnel !',
  'Très bon accueil et prestation de qualité.',
  'Je recommande vivement, résultat parfait.',
  'Ambiance agréable, équipe à l\'écoute.',
  'Bon rapport qualité-prix.',
  'Prestation correcte sans plus.',
  'Un peu d\'attente mais le résultat vaut le coup.',
  'Super expérience, je reviendrai !',
  'Coiffeur talentueux, très satisfaite.',
  'Cadre moderne et service impeccable.',
];

const PRO_NAMES = [
  ['Sophie', 'Martin'], ['Julie', 'Bernard'], ['Marc', 'Dubois'], ['Léa', 'Petit'],
  ['Thomas', 'Robert'], ['Emma', 'Richard'], ['Nicolas', 'Moreau'], ['Camille', 'Simon'],
];

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function dayAtOffset(daysFromToday, hour = 10, minute = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function calcDeposit(price) {
  return Math.round(price * 0.3);
}

function fakePaymentIntentId(seed) {
  return `pi_demo_${String(seed).padStart(5, '0')}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Génère paymentStatus, paymentId et paymentDetails cohérents selon le statut du RDV.
 */
function buildAppointmentPayment(service, { status, isPast }, apptSeed) {
  const totalAmount = service.price;
  const depositAmount = calcDeposit(totalAmount);
  const roll = apptSeed % 10;

  if (status === 'canceled') {
    if (roll < 4) {
      return {
        paymentStatus: 'refunded',
        paymentId: fakePaymentIntentId(apptSeed),
        paymentDetails: {
          paymentType: 'deposit',
          totalAmount,
          depositAmount,
          remainingAmount: 0,
        },
      };
    }
    return {
      paymentStatus: 'pending',
      paymentId: null,
      paymentDetails: {
        paymentType: roll < 7 ? 'on_site' : 'deposit',
        totalAmount,
        depositAmount,
        remainingAmount: totalAmount,
      },
    };
  }

  if (status === 'completed') {
    if (roll < 4) {
      return {
        paymentStatus: 'paid',
        paymentId: null,
        paymentDetails: {
          paymentType: 'on_site',
          totalAmount,
          depositAmount,
          remainingAmount: 0,
        },
      };
    }
    if (roll < 7) {
      return {
        paymentStatus: 'paid',
        paymentId: fakePaymentIntentId(apptSeed),
        paymentDetails: {
          paymentType: 'deposit',
          totalAmount,
          depositAmount,
          remainingAmount: 0,
        },
      };
    }
    return {
      paymentStatus: 'paid',
      paymentId: fakePaymentIntentId(apptSeed),
      paymentDetails: {
        paymentType: 'full',
        totalAmount,
        depositAmount,
        remainingAmount: 0,
      },
    };
  }

  // À venir : pending ou confirmed
  if (roll < 3) {
    return {
      paymentStatus: 'pending',
      paymentId: null,
      paymentDetails: {
        paymentType: 'on_site',
        totalAmount,
        depositAmount,
        remainingAmount: totalAmount,
      },
    };
  }
  if (roll < 7) {
    return {
      paymentStatus: 'partial',
      paymentId: fakePaymentIntentId(apptSeed),
      paymentDetails: {
        paymentType: 'deposit',
        totalAmount,
        depositAmount,
        remainingAmount: totalAmount - depositAmount,
      },
    };
  }
  if (status === 'confirmed') {
    return {
      paymentStatus: 'paid',
      paymentId: fakePaymentIntentId(apptSeed),
      paymentDetails: {
        paymentType: 'full',
        totalAmount,
        depositAmount,
        remainingAmount: 0,
      },
    };
  }
  return {
    paymentStatus: 'pending',
    paymentId: null,
    paymentDetails: {
      paymentType: 'on_site',
      totalAmount,
      depositAmount,
      remainingAmount: totalAmount,
    },
  };
}

async function clearDemoData() {
  const demoUsers = await User.find({ email: /@timvio\.demo$/ }).select('_id');
  const ids = demoUsers.map((u) => u._id);

  if (ids.length === 0) return;

  await Review.deleteMany({ $or: [{ client: { $in: ids } }, { salon: { $in: ids } }] });
  await Appointment.deleteMany({ $or: [{ client: { $in: ids } }, { salon: { $in: ids } }] });
  await Service.deleteMany({ salon: { $in: ids } });
  await Professional.deleteMany({ salon: { $in: ids } });
  await Availability.deleteMany({ salon: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });

  console.log(`🗑️  ${ids.length} comptes démo supprimés`);
}

async function seed() {
  await connectDatabase();

  if (FRESH) {
    await clearDemoData();
  }

  const salonPassword = await bcrypt.hash(SALON_PASSWORD, 10);
  const clientPassword = await bcrypt.hash(CLIENT_PASSWORD, 10);

  const salons = [];
  let salonIndex = 0;

  for (let ci = 0; ci < CITIES.length; ci++) {
    const loc = CITIES[ci];
    const salonsPerCity = ci < 6 ? 3 : 2;

    for (let s = 0; s < salonsPerCity; s++) {
      salonIndex++;
      const type = SALON_PREFIXES[(ci + s) % SALON_PREFIXES.length];
      const email = `salon.${loc.city.toLowerCase().replace(/\s/g, '')}${salonIndex}@timvio.demo`;

      if (await User.findOne({ email })) continue;

      const name =
        type.prefix === type.speciality
          ? `${type.prefix} ${loc.city}${s > 0 ? ` ${s + 1}` : ''}`
          : `${type.prefix} ${type.speciality} ${loc.city}${s > 0 ? ` ${s + 1}` : ''}`;
      const offsetLng = (Math.random() - 0.5) * 0.04;
      const offsetLat = (Math.random() - 0.5) * 0.04;

      const salon = await User.create({
        email,
        password: salonPassword,
        role: 'salon',
        isVerified: true,
        speciality: type.speciality,
        phone: `06${String(10000000 + salonIndex).slice(1)}`,
        address: {
          street: `${12 + s} rue de la Beauté`,
          city: loc.city,
          postalCode: loc.postal,
          country: 'France',
        },
        salon: {
          name,
          description: `${name} — ${type.speciality.toLowerCase()} de qualité à ${loc.city}.`,
          images: [],
        },
        location: {
          type: 'Point',
          coordinates: [loc.lng + offsetLng, loc.lat + offsetLat],
        },
        bio: `Bienvenue chez ${name}.`,
        stripeAccountId:
          salonIndex % 3 !== 0 ? `acct_demo_${String(salonIndex).padStart(4, '0')}` : undefined,
      });

      await Availability.create({
        salon: salon._id,
        availability: DEFAULT_AVAILABILITY,
        exceptions: [],
        blockedSlots: [],
      });

      const services = [];
      const svcCount = 4 + (salonIndex % 4);
      for (let si = 0; si < svcCount; si++) {
        const tmpl = SERVICE_TEMPLATES[si % SERVICE_TEMPLATES.length];
        services.push(await Service.create({
          salon: salon._id,
          ...tmpl,
          description: `${tmpl.name} chez ${name}`,
          isActive: true,
        }));
      }

      const pros = [];
      const proCount = 2 + (salonIndex % 2);
      for (let p = 0; p < proCount; p++) {
        const [fn, ln] = PRO_NAMES[(salonIndex + p) % PRO_NAMES.length];
        pros.push(await Professional.create({
          name: `${fn} ${ln}`,
          email: `pro.${salonIndex}.${p + 1}@timvio.demo`,
          salon: salon._id,
          specialties: [type.speciality, services[p % services.length].name],
          isActive: true,
        }));
      }

      salons.push({ salon, services, pros });
      console.log(`  ✓ Salon: ${name}`);
    }
  }

  const clients = [];
  for (let i = 0; i < CLIENT_NAMES.length; i++) {
    const [firstName, lastName] = CLIENT_NAMES[i];
    const email = `client${i + 1}@timvio.demo`;

    if (await User.findOne({ email })) {
      const existing = await User.findOne({ email });
      clients.push(existing);
      continue;
    }

    const client = await User.create({
      email,
      password: clientPassword,
      role: 'client',
      firstName,
      lastName,
      isVerified: true,
      phone: `07${String(60000000 + i).slice(1)}`,
    });
    clients.push(client);
  }
  console.log(`\n👤 ${clients.length} clients prêts`);

  let appointmentCount = 0;
  let reviewCount = 0;
  const paymentStats = { pending: 0, partial: 0, paid: 0, refunded: 0 };
  let apptSeed = 0;

  for (const { salon, services, pros } of salons) {
    const reviewTarget = 3 + Math.floor(Math.random() * 8);

    for (let r = 0; r < reviewTarget; r++) {
      const client = pickRandom(clients);
      const rating = r < reviewTarget * 0.7 ? pickRandom([4, 5, 5, 5, 4]) : pickRandom([3, 4, 5, 2]);

      const exists = await Review.findOne({ client: client._id, salon: salon._id });
      if (exists) continue;

      await Review.create({
        client: client._id,
        salon: salon._id,
        rating,
        comment: pickRandom(REVIEW_COMMENTS),
      });
      reviewCount++;
    }

    const apptCount = 4 + Math.floor(Math.random() * 6);
    for (let a = 0; a < apptCount; a++) {
      const client = pickRandom(clients);
      const service = pickRandom(services);
      const pro = pickRandom(pros);
      const dayOffset = pickRandom([-14, -10, -7, -3, -1, 2, 5, 8, 12, 15]);
      const startTime = pickRandom(['09:00', '10:30', '11:00', '14:00', '15:30', '16:00', '17:00']);
      const isPast = dayOffset < 0;
      const status = isPast
        ? pickRandom(['completed', 'completed', 'completed', 'canceled'])
        : pickRandom(['confirmed', 'confirmed', 'pending']);

      const payment = buildAppointmentPayment(service, { status, isPast }, apptSeed++);
      paymentStats[payment.paymentStatus] = (paymentStats[payment.paymentStatus] || 0) + 1;

      await Appointment.create({
        client: client._id,
        salon: salon._id,
        service: service._id,
        professional: pro._id,
        date: dayAtOffset(dayOffset),
        startTime,
        endTime: addMinutes(startTime, service.duration),
        status,
        paymentStatus: payment.paymentStatus,
        paymentId: payment.paymentId,
        paymentDetails: payment.paymentDetails,
        notes: a % 3 === 0 ? 'Première visite' : undefined,
      });
      appointmentCount++;
    }
  }

  console.log(`\n📅 ${appointmentCount} rendez-vous créés`);
  console.log(`💳 Paiements — en attente: ${paymentStats.pending}, acompte: ${paymentStats.partial}, payé: ${paymentStats.paid}, remboursé: ${paymentStats.refunded}`);
  console.log(`⭐ ${reviewCount} avis créés`);
  console.log(`🏪 ${salons.length} salons au total`);
  console.log('\n🔑 Comptes démo :');
  console.log(`   Salons  → *@timvio.demo / ${SALON_PASSWORD}`);
  console.log(`   Clients → client1@timvio.demo … client${CLIENT_NAMES.length}@timvio.demo / ${CLIENT_PASSWORD}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erreur seed:', err);
  process.exit(1);
});
