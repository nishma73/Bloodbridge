const Notification = require('../models/Notification');

const createNotification = async ({ userId, title, body, link = '' }) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      body,
      link,
      read: false,
    });
    return notification;
  } catch (err) {
    console.error(`[Notification] Error creating notification: ${err.message}`);
    return null;
  }
};

const notifyDonorsOfRequest = async (donorUserIds, request) => {
  const promises = donorUserIds.map((userId) =>
    createNotification({
      userId,
      title: 'New donation request',
      body: `${request.hospitalName} needs ${request.bloodGroup} blood${
        request.urgency === 'high' ? ' urgently' : ''
      }.`,
      link: '/donor',
    })
  );
  return Promise.all(promises);
};

const notifyHospitalOfDonorResponse = async ({ hospitalUserId, donorName, bloodGroup, status, requestBloodGroup }) => {
  return createNotification({
    userId: hospitalUserId,
    title: `Donor ${status} your request`,
    body: `${donorName} (${bloodGroup}) ${status} your request for ${requestBloodGroup} blood.`,
    link: '/hospital',
  });
};

const notifyDonorOfCompletion = async ({ donorUserId, hospitalName }) => {
  return createNotification({
    userId: donorUserId,
    title: 'Donation confirmed',
    body: `${hospitalName} marked your donation as completed. Thank you for saving lives!`,
    link: '/donor',
  });
};

module.exports = {
  createNotification,
  notifyDonorsOfRequest,
  notifyHospitalOfDonorResponse,
  notifyDonorOfCompletion,
};
