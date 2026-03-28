import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "eldomoreogbohouili@gmail.com",
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.BREVO_EMAIL_NAME}" <${process.env.BREVO_EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`Email envoyé à ${to}`);
  } catch (error) {
    console.error("Erreur envoi email →", error.message);
  }
};

// Template confirmation réservation
export const sendConfirmationReservation = async (reservation, item) => {
  const html = `
    <h2>Merci pour votre réservation Even Travel ! 🎉</h2>
    <p>Bonjour ${reservation.client.prenom} ${reservation.client.nom},</p>
    <p>Votre réservation pour <strong>${item.titre || item.nom}</strong> est confirmée.</p>
    <ul>
      <li>Date : ${new Date(item.date || item.datesDisponibles[0].debut).toLocaleDateString("fr-FR")}</li>
      <li>Nombre de places : ${reservation.nombrePlaces}</li>
      <li>Montant total : ${reservation.montantTotal} FCFA</li>
      <li>Statut paiement : ${reservation.statutPaiement === "paye" ? "Payé" : "En attente"}</li>
    </ul>
    <p>Nous vous contacterons très bientôt avec les détails.</p>
    <p>L'équipe Even Travel</p>
  `;

  await sendEmail(
    reservation.client.email,
    "Confirmation réservation Even Travel",
    html,
  );
};
