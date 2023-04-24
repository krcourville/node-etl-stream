import { ApolloClient, InMemoryCache, gql } from "@apollo/client/core";

export type ActorName = {
    firstName: string;
    lastName: string;
}

export class ActorApiClient {
    private gqlclient: ApolloClient<unknown>;

    constructor() {
        this.gqlclient = new ApolloClient({
            uri: "http://localhost:4000",
            cache: new InMemoryCache(),
        });
    }

    async getActorNameById(actorId: string): Promise<ActorName> {
        const response = await this.gqlclient.query({
            query: gql`
                query GetActor($actorId: ID!) {
                    actor(id: $actorId) {
                        firstName
                        lastName
                    }
                }
            `,
            variables: {
                actorId
            }
        });
        return response.data.actor;
    }

}
