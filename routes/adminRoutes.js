const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/authMiddleware');
const {
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
} = require('../controllers/adminController');

router.use(auth, authorize('admin'));

router.get('/dashboard/stats', getDashboardStats);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/salons', getSalons);
router.patch('/salons/:id', updateSalon);
router.get('/payments', getPayments);
router.patch('/payments/:id', updatePayment);
router.get('/appointments', getAppointments);
router.patch('/appointments/:id', updateAppointment);
router.delete('/salons/:id', deleteSalon);

router.get('/notifications', getAdminNotifications);
router.get('/notifications/mine', getMyNotifications);
router.get('/notifications/unread-count', getUnreadNotificationsCount);
router.post('/notifications/send', sendAdminNotification);
router.patch('/notifications/mine/read-all', markAllMyNotificationsRead);
router.patch('/notifications/mine/:id/read', markMyNotificationRead);

module.exports = router;
