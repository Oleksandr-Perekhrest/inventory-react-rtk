// local dependencies
import type { Db } from "../../db";
import type { Supplier } from "../../../domain";

export function listSuppliers({ db }: { db: Db }): { body: Supplier[] } {
    const sorted = [...db.suppliers].sort((a, b) =>
        a.name.localeCompare(b.name),
    );
    return { body: sorted };
}
