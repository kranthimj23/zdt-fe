import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'noEmbeddedCredentials', async: false })
export class NoEmbeddedCredentials implements ValidatorConstraintInterface {
    validate(url: string) {
        try {
            const parsed = new URL(url);
            return !parsed.username && !parsed.password;
        } catch (e) {
            return false;
        }
    }

    defaultMessage() {
        return 'URL must not contain embedded credentials. Store credentials separately.';
    }
}
