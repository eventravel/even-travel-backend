import Reservation from "../models/Reservation.js";
import Comment from "../models/Comment.js";
import Destination from "../models/Destination.js";
import Event from "../models/Event.js";
import Article from "../models/Article.js";
import catchAsync from "../utils/catchAsync.js";

export const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await Promise.all([
    Reservation.countDocuments(),
    Reservation.countDocuments({ statutPaiement: "paye" }),
    Reservation.aggregate([
      { $group: { _id: null, total: { $sum: "$montantTotal" } } },
    ]),
    Comment.countDocuments({ approved: false }),
    Destination.countDocuments({ featured: true }),
    Event.countDocuments({ date: { $gte: new Date() } }),
  ]);

  const caTotal = stats[2][0]?.total || 0;

  res.status(200).json({
    status: "success",
    data: {
      reservationsTotal: stats[0],
      reservationsPayees: stats[1],
      chiffreAffaires: caTotal,
      commentairesEnAttente: stats[3],
      destinationsFeatured: stats[4],
      evenementsAVenir: stats[5],
    },
  });
});

export const getAllReservationsAdmin = catchAsync(async (req, res) => {
  const reservations = await Reservation.find()
    .populate("itemId", "titre nom prix")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: reservations.length,
    data: { reservations },
  });
});
