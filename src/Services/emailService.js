import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

export const enviarNotificacionFirma = async ({ correoPresidente, profesorId, numeroEvento, nombreProfesor, nombrePresidente }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('Faltan SMTP_USER o SMTP_PASSWORD para enviar correos');
  }

  const url = `${process.env.FRONTEND_URL || ''}/profesores/${profesorId}/credenciales`;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: correoPresidente,
    subject: 'Nuevo evento credencial pendiente de firma',
    html: `<h1>Evento credencial pendiente de firma</h1>
      <p>Cordial Saludo,</p>
      <p>Estimado/a ${nombrePresidente || 'Presidente'}, se ha creado un nuevo evento de credencial que requiere su firma.</p>
      <p>Detalle:</p>
      <p><strong>Profesor:</strong> ${nombreProfesor || profesorId}</p>
      <p><strong>Número de evento:</strong> ${numeroEvento}</p>
      <p><a href="${url}">Le solicitamos comedidamente revisar y agregar firma</a></p>`
  });
};
