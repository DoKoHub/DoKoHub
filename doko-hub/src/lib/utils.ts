export function validateEmail(email: string): boolean {
    // Entferne umschließende einfache oder doppelte Anführungszeichen
    email = email.trim();
    if (email.startsWith("'") && email.endsWith("'")) {
        email = email.slice(1, -1);
    }

    return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        .test(email.toLowerCase());
}