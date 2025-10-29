import type { PageServerLoad } from "./$types";
import oauth_providers from "../../../../oauth-providers.json";

//TODO: populate oauth interface
export interface OAuthProvider {
    name: string,
    displayName: string,
}

function load_oauth_providers(): OAuthProvider[] {
    //TODO: implement loading oauth providers from config file
    return oauth_providers;
}

export const load: PageServerLoad = async () => {
    return {
        oauth_providers: load_oauth_providers(),
    };
};