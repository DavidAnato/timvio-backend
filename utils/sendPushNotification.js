
const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
    if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
      console.warn('❗ Token non valide :', expoPushToken);
      return;
    }
  console.log(expoPushToken, title, body, data)
    try {
      const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      };
  
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
  
      const result = await response.json();
  
      if (result.data && result.data.status === 'ok') {
        console.log('✅ Notification envoyée à', expoPushToken);
      } else {
        console.warn('⚠️ Erreur côté Expo :', result.data || result.errors);
      }
  
      return result;
    } catch (error) {
      console.error('❌ Erreur envoi notification push :', error);
    }
  };

  // Test
//   sendPushNotification('ExponentPushToken[wBcSDxFkDRjbk9GWn59ufh]', 'Test', 'Test', {
//     appointmentId: '6654321'
//   });
  
  module.exports = sendPushNotification;