import fastifyPkg from 'fastify';
const Fastify = fastifyPkg.default || fastifyPkg;
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import pool from './db.ts';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import orderRoutes from './routes/orders.ts';
import menuRoutes from './routes/menu.ts';
// import inventoryRoutes from './routes/inventory.ts';
// import authRoutes from './routes/auth.ts';
// import superadminRestaurantRoutes from './routes/superadmin_restaurants.ts';
// import superadminSubscriptionRoutes from './routes/superadmin_subscriptions.ts';
// import superadminSettingsRoutes from './routes/superadmin_settings.ts';
// import superadminSupportRoutes from './routes/superadmin_support.ts';
// import payrollRoutes from './routes/payroll.ts';
// import recipeRoutes from './routes/recipes.ts';
// import taskRoutes from './routes/tasks.ts';
import tableRoutes from './routes/tables.ts';
// import reservationRoutes from './routes/reservations.ts';
// import kitchenOrderRoutes from './routes/kitchen.ts';
import deliveryRoutes from './routes/deliveries.ts';
import deliveryApiKeysRoutes from './routes/delivery_api_keys.ts';

export default async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  });


  // await app.register(authRoutes);
  await app.register(helmet as any);
  await app.register(cors, { origin: true });
  await app.register(multipart);
  // Test database connection on startup
  try {
    await pool.query('SELECT 1');
    app.log.info('Connected to PostgreSQL database');
  } catch (err: any) {
    app.log.error({ err }, 'Database connection failed:');
    process.exit(1);
  }
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  // await app.register(userRoutes); // users route missing
  await app.register(orderRoutes);
  await app.register(menuRoutes);
  // await app.register(inventoryRoutes);
  // await app.register(superadminRestaurantRoutes);
  // await app.register(superadminSubscriptionRoutes);
  // await app.register(superadminSettingsRoutes);
  // await app.register(superadminSupportRoutes);
  // await app.register(payrollRoutes);
  // await app.register(recipeRoutes);
  // await app.register(taskRoutes);
  await app.register(tableRoutes);
  // await app.register(reservationRoutes);
  // await app.register(kitchenOrderRoutes);
  await app.register(deliveryRoutes);
  await app.register(deliveryApiKeysRoutes);
  // Swagger is optional; add back a compatible swagger plugin/version when needed
  // app.register(healthRoutes, { prefix: '/health' });
  // app.register(exampleRoutes, { prefix: '/api' });

  // Simple route to test database query
  app.get('/db-test', async (request, reply) => {
    try {
      const result = await pool.query('SELECT NOW() as now');
      reply.send({ success: true, time: result.rows[0].now });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Example route: Hello World
  app.get('/hello', async (req, reply) => {
    reply.send({ message: 'Hello World!' });
  });

  // Graceful shutdown
  app.addHook('onClose', async (instance) => {
    instance.log.info('Fastify server closing');
    await pool.end();
  });

  return app;
}
