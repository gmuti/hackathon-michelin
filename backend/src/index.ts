import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { restaurantsRouter } from './modules/restaurants/restaurants.router';
import { hotelsRouter } from './modules/hotels/hotels.router';
import { swipeRouter } from './modules/swipe/swipe.router';
import { jamRouter } from './modules/jam/jam.router';
import { usersRouter } from './modules/users/users.router';
import { reviewsRouter } from './modules/reviews/reviews.router';
import { setupJamGateway } from './modules/jam/jam.gateway';

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/restaurants', restaurantsRouter);
app.use('/api/v1/hotels', hotelsRouter);
app.use('/api/v1/swipe', swipeRouter);
app.use('/api/v1/jam', jamRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/reviews', reviewsRouter);

app.use(errorHandler);

setupJamGateway(io);

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`MichelinMatch API running on http://localhost:${PORT}/api/v1`);
});
