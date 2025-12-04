export class GETResponse extends Response {
    constructor(payload: any) {
        super(
            JSON.stringify(payload),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export class POSTResponse extends Response {
    constructor(message: string, payload: { name: string, data: any }) {
        super(
            JSON.stringify({
                message,
                [payload.name]: payload.data
            }),
            {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export class PUTOrDeleteResponse extends Response {
    constructor(message: string, payload: { name: string, data: any }) {
        super(
            JSON.stringify({
                message,
                [payload.name]: payload.data
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export class BadResponse extends Response {
    constructor(message: string) {
        super(
            JSON.stringify({
                error: message
            }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export class ErrorResponse extends Response {
    constructor(message: string) {
        super(
            JSON.stringify({
                error: message
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}