import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe with whitelist & automatic transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Set global API prefix
  app.setGlobalPrefix("api");

  // Configure Swagger OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle("Branchwork API")
    .setDescription("Multi-tenant retail console backend with branch-scoped RBAC")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Branchwork API is running on: http://localhost:${port}/api`);
  console.log(`📚 Interactive Swagger Docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
