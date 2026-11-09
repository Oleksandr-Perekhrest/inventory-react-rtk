// local dependencies
import type { Db } from "../../db";

export function demoReset({ db }: { db: Db }): { status: number } {
    db.reset();
    return { status: 204 };
}
