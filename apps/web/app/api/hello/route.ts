import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest, res: NextResponse) {
    return Response.json(JSON.stringify(req.cookies))
}