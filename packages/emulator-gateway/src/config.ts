export const config = {
  port: Number(process.env.PORT) || 8090,
  mode: (process.env.EMULATOR_MODE as 'mock' | 'live') || 'mock',
  orionUrl: process.env.ORION_URL || 'http://localhost:1026',
  mrpApiUrl: process.env.MRP_API_URL || 'http://localhost:8080',
  contextUrl:
    process.env.CONTEXT_URL ||
    'http://localhost:3000/contexts/mrp/v0.1/context.jsonld',
  notifyUrl:
    process.env.NOTIFY_URL || 'http://emulator-gateway:8090/notify',
};
