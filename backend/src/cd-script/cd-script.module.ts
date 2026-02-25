import { Module } from '@nestjs/common';
import { CDScriptController } from './cd-script.controller';
import { CDScriptService } from './cd-script.service';

@Module({
    controllers: [CDScriptController],
    providers: [CDScriptService],
})
export class CDScriptModule { }
