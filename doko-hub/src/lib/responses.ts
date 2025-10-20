export function GETResponse(payload: any): Response {
    return new Response(
        JSON.stringify({
            payload
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

export function POSTResponse(message: string, payload: {name: string, data: any}): Response {
    return new Response(
        JSON.stringify({
            message: message,
            [payload.name]: payload.data
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

export function PUTOrDeleteResponse(message: string, payload: {name: string, data: any}): Response {
    return new Response(
        JSON.stringify({
            message: message,
            [payload.name]: payload.data
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

export function BadResponse(message: string): Response {
    return new Response(
        JSON.stringify({
            error: message
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

export function ErrorResponse(message: string, error: any): Response {
    return new Response(
        JSON.stringify({
            error: message,
            details: error instanceof Error? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}