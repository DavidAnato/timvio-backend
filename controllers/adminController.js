const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Professional = require('../models/Professional');
const { UserNotification } = require('../models/Notification');
const {
  createNotification,
  createNotificationForAll,
  markNotificationAsRead,
} = require('../utils/createNotification');

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.otp;
  delete obj.verificationToken;
  return obj;
};

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalClients,
      totalSalons,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      totalPayments,
      completedPayments,
      revenueAgg,
      recentAppointments,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'salon' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'completed' }),
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'completed' }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Appointment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('client', 'firstName lastName email')
        .populate('salon', 'salon.name email')
        .populate('service', 'name price'),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-password -otp -verificationToken'),
    ]);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      stats: {
        totalUsers,
        totalClients,
        totalSalons,
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        totalPayments,
        completedPayments,
        totalRevenue: revenueAgg[0]?.total || 0,
      },
      monthlyRevenue,
      recentAppointments,
      recentUsers: recentUsers.map(sanitizeUser),
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques', error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { 'salon.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -otp -verificationToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { isVerified, role, firstName, lastName, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if (isVerified !== undefined) user.isVerified = isVerified;
    if (role && ['client', 'salon', 'admin'].includes(role)) user.role = role;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;

    await user.save();
    res.json({ message: 'Utilisateur mis à jour', user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Impossible de supprimer un administrateur' });
    }
    await user.deleteOne();
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
};

const getSalons = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', verified } = req.query;
    const query = { role: 'salon' };

    if (verified !== undefined) query.isVerified = verified === 'true';
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'salon.name': { $regex: search, $options: 'i' } },
        { speciality: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [salons, total] = await Promise.all([
      User.find(query)
        .select('-password -otp -verificationToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    const salonIds = salons.map((s) => s._id);
    const professionalCounts = await Professional.aggregate([
      { $match: { salon: { $in: salonIds } } },
      { $group: { _id: '$salon', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(professionalCounts.map((p) => [p._id.toString(), p.count]));

    const enriched = salons.map((salon) => ({
      ...salon.toObject(),
      professionalsCount: countMap[salon._id.toString()] || 0,
    }));

    res.json({
      salons: enriched,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des salons', error: error.message });
  }
};

const updateSalon = async (req, res) => {
  try {
    const salon = await User.findOne({ _id: req.params.id, role: 'salon' });
    if (!salon) return res.status(404).json({ message: 'Salon non trouvé' });

    const { isVerified, speciality, salon: salonData, address } = req.body;
    if (isVerified !== undefined) salon.isVerified = isVerified;
    if (speciality) salon.speciality = speciality;
    if (salonData) salon.salon = { ...salon.salon?.toObject?.() || salon.salon, ...salonData };
    if (address) salon.address = { ...salon.address?.toObject?.() || salon.address, ...address };

    await salon.save();
    res.json({ message: 'Salon mis à jour', salon: sanitizeUser(salon) });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du salon', error: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('user', 'firstName lastName email salon.name role')
        .populate('appointment', 'date status paymentStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    res.json({
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des paiements', error: error.message });
  }
};

const getAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (Number(page) - 1) * Number(limit);
    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('client', 'firstName lastName email')
        .populate('salon', 'salon.name email')
        .populate('service', 'name price')
        .populate('professional', 'firstName lastName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Appointment.countDocuments(query),
    ]);

    res.json({
      appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des rendez-vous', error: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Rendez-vous non trouvé' });

    if (status) appointment.status = status;
    if (paymentStatus) appointment.paymentStatus = paymentStatus;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate('client', 'firstName lastName email')
      .populate('salon', 'salon.name email')
      .populate('service', 'name price');

    res.json({ message: 'Rendez-vous mis à jour', appointment: populated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Paiement non trouvé' });

    if (status && ['pending', 'completed', 'failed'].includes(status)) {
      payment.status = status;
    }
    await payment.save();

    const populated = await Payment.findById(payment._id)
      .populate('user', 'firstName lastName email salon.name role')
      .populate('appointment', 'date status paymentStatus');

    res.json({ message: 'Paiement mis à jour', payment: populated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du paiement', error: error.message });
  }
};

const deleteSalon = async (req, res) => {
  try {
    const salon = await User.findOne({ _id: req.params.id, role: 'salon' });
    if (!salon) return res.status(404).json({ message: 'Salon non trouvé' });

    await Professional.deleteMany({ salon: salon._id });
    await salon.deleteOne();
    res.json({ message: 'Salon et données associées supprimés' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
};

const getAdminNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', isRead } = req.query;
    const query = {};

    if (isRead !== undefined) query.is_read = isRead === 'true';
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total] = await Promise.all([
      UserNotification.find(query)
        .populate('recipient', 'firstName lastName email role salon.name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit)),
      UserNotification.countDocuments(query),
    ]);

    res.json({
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des notifications', error: error.message });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const userId = req.user.userId;
    const query = { recipient: userId };

    if (isRead !== undefined) query.is_read = isRead === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      UserNotification.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit)),
      UserNotification.countDocuments(query),
      UserNotification.countDocuments({ recipient: userId, is_read: false }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de vos notifications', error: error.message });
  }
};

const getUnreadNotificationsCount = async (req, res) => {
  try {
    const count = await UserNotification.countDocuments({
      recipient: req.user.userId,
      is_read: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du comptage', error: error.message });
  }
};

const sendAdminNotification = async (req, res) => {
  try {
    const { title, message, target, recipientId, role } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Le titre et le message sont obligatoires' });
    }

    const additionalData = {
      title: title.trim(),
      type: 'admin_broadcast',
      sentBy: req.user.userId,
      sentAt: new Date().toISOString(),
    };

    let result;

    if (target === 'user') {
      if (!recipientId) {
        return res.status(400).json({ message: 'Destinataire requis pour une notification ciblée' });
      }
      result = await createNotification(title.trim(), message.trim(), recipientId, additionalData);
    } else if (target === 'role') {
      if (!role || !['client', 'salon', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Rôle invalide' });
      }
      result = await createNotificationForAll(title.trim(), message.trim(), { role });
    } else if (target === 'all') {
      result = await createNotificationForAll(title.trim(), message.trim(), {});
    } else {
      return res.status(400).json({ message: 'Cible invalide (user, role ou all)' });
    }

    res.status(201).json({
      message: result.message || 'Notification(s) envoyée(s)',
      ...result,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'envoi', error: error.message });
  }
};

const markMyNotificationRead = async (req, res) => {
  try {
    const result = await markNotificationAsRead(req.params.id, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(404).json({ message: error.message || 'Notification introuvable' });
  }
};

const markAllMyNotificationsRead = async (req, res) => {
  try {
    const result = await UserNotification.updateMany(
      { recipient: req.user.userId, is_read: false },
      { is_read: true }
    );
    res.json({ message: 'Toutes les notifications marquées comme lues', modified: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du marquage', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUser,
  deleteUser,
  getSalons,
  updateSalon,
  getPayments,
  updatePayment,
  getAppointments,
  updateAppointment,
  deleteSalon,
  getAdminNotifications,
  getMyNotifications,
  getUnreadNotificationsCount,
  sendAdminNotification,
  markMyNotificationRead,
  markAllMyNotificationsRead,
};
