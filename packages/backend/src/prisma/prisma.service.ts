import { PrismaClient } from "../../prisma/generated/client";


import { Injectable, OnModuleInit, Options } from "@nestjs/common";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit {
  

  async onModuleInit() {
    await this.$connect();
  }
}