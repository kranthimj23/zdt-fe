import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execPromise = promisify(exec);

@Injectable()
export class CDScriptService {
    private readonly logger = new Logger(CDScriptService.name);
    private readonly pythonPath = 'D:\\GarudaBE\\BE_unified_state\\backend\\.venv\\Scripts\\python.exe';
    private readonly garudaBePath = 'D:\\GarudaBE\\BE_unified_state\\backend\\app\\cd\\scripts';

    private getEnv() {
        const env = { ...process.env };
        env.PYTHONPATH = this.garudaBePath + (env.PYTHONPATH ? path.delimiter + env.PYTHONPATH : '');
        return env;
    }

    async executeCreateReleaseNote(params: {
        lowerEnv: string;
        higherEnv: string;
        sourceBranch: string;
        destinationBranch: string;
    }) {
        const scriptPath = path.join(this.garudaBePath, 'create_release_note.py');
        // create_release_note.py expects: branch_x-1 branch_x envs[0] envs[1] repo_url
        // Based on the code, it uses sys.argv[1]..sys.argv[5]
        const command = `${this.pythonPath} "${scriptPath}" "${params.sourceBranch}" "${params.destinationBranch}" "${params.lowerEnv}" "${params.higherEnv}" "placeholder_repo_url"`;

        this.logger.log(`Executing: ${command}`);
        try {
            const { stdout, stderr } = await execPromise(command, { env: this.getEnv(), cwd: this.garudaBePath });
            if (stderr) this.logger.warn(`Script stderr: ${stderr}`);
            return { success: true, output: stdout };
        } catch (error) {
            this.logger.error(`Script execution failed: ${error.message}`);
            return { success: false, error: error.message, output: error.stdout };
        }
    }

    async executeGenerateConfig(params: {
        environment: string;
        releaseBranch: string;
    }) {
        const scriptPath = path.join(this.garudaBePath, 'generate-config.py');
        const command = `${this.pythonPath} "${scriptPath}" --env "${params.environment}" --branch "${params.releaseBranch}"`;

        this.logger.log(`Executing: ${command}`);
        try {
            const { stdout, stderr } = await execPromise(command, { env: this.getEnv(), cwd: this.garudaBePath });
            if (stderr) this.logger.warn(`Script stderr: ${stderr}`);
            return { success: true, output: stdout };
        } catch (error) {
            this.logger.error(`Script execution failed: ${error.message}`);
            return { success: false, error: error.message, output: error.stdout };
        }
    }

    async executeDeploy(params: {
        type: string; // e.g., 'application'
    }) {
        const scriptPath = path.join(this.garudaBePath, 'deploy.py');
        // deploy.py expects: <env> <repo_url> <branch>
        const command = `${this.pythonPath} "${scriptPath}" "placeholder_env" "placeholder_repo" "placeholder_branch" --type "${params.type}"`;

        this.logger.log(`Executing: ${command}`);
        try {
            const { stdout, stderr } = await execPromise(command, { env: this.getEnv(), cwd: this.garudaBePath });
            if (stderr) this.logger.warn(`Script stderr: ${stderr}`);
            return { success: true, output: stdout };
        } catch (error) {
            this.logger.error(`Script execution failed: ${error.message}`);
            return { success: false, error: error.message, output: error.stdout };
        }
    }
}
