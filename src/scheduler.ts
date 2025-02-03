import { eq, lte } from "drizzle-orm";
import { getDb } from "./db";
import { TaskQueue, taskQueue } from "./schema";

type PayloadType =
    | "MedicationReminder"
    | "SideEffectReminder"
    | "EmergencyAlert";

type Payload = {
    type: PayloadType;
    data: object;
};

type PayloadWithId = Payload & { id: number };

// Return back null if you don't want the task to fire again
export async function taskHandler(
    db: D1Database,
    payload: PayloadWithId,
): Promise<object | null> {
    return null;
}

export async function handleScheduledTask(
    controller: ScheduledController,
    env: CloudflareBindings,
    ctx: ExecutionContext,
) {
    const pendingTasks = await getDb(env.DB).delete(taskQueue).where(
        lte(taskQueue.timestamp, new Date(controller.scheduledTime)),
    ).returning();
    const results = await Promise.all(
        pendingTasks.map(async (task) => {
            const payload = await taskHandler(env.DB, {
                ...JSON.parse(task.payload),
                id: task.id,
            });
            return { ...task, payload };
        }),
    );
    const nextTasks: TaskQueue[] = results.filter((task) =>
        !task.oneTime || task.payload != null
    )
        .map((task) => ({
            ...task,
            payload: JSON.stringify(task.payload),
            timestamp: getNextCronTimestamp(
                task.cron,
                task.timestamp,
            ),
        }));
    if (nextTasks.length > 0) {
        await getDb(env.DB).insert(taskQueue).values(nextTasks);
    }
}

export async function scheduleTask(
    db: D1Database,
    cron: string,
    type: PayloadType,
    payload: object,
    oneTime: boolean,
) {
    await getDb(db).insert(taskQueue).values({
        timestamp: getNextCronTimestamp(cron),
        cron,
        payload: JSON.stringify({ type, data: payload }),
        oneTime,
    });
}

export async function cancelTask(db: D1Database, id: number) {
    await getDb(db).delete(taskQueue).where(eq(taskQueue.id, id));
}

function getNextCronTimestamp(
    cronExpression: string,
    currentDate = new Date(),
) {
    // Parse cron expression (minute hour dayOfMonth month dayOfWeek)
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(
        " ",
    );

    const next = new Date(currentDate);

    // Helper function to parse cron field
    const parseCronField = (field: string, min: number, max: number) => {
        if (field === "*") {
            return Array.from({ length: max - min + 1 }, (_, i) => i + min);
        }
        return field.split(",").map((item) => {
            if (item.includes("-")) {
                const [start, end] = item.split("-").map(Number);
                return Array.from(
                    { length: end - start + 1 },
                    (_, i) => i + start,
                );
            }
            if (item.includes("/")) {
                const [start, step] = item.split("/");
                const startNum = start === "*" ? min : parseInt(start);
                return Array.from(
                    {
                        length: Math.floor((max - startNum) / parseInt(step)) +
                            1,
                    },
                    (_, i) => startNum + (i * parseInt(step)),
                );
            }
            return parseInt(item);
        }).flat().filter((num) => num >= min && num <= max);
    };

    // Parse all fields
    const minutes = parseCronField(minute, 0, 59);
    const hours = parseCronField(hour, 0, 23);
    const daysOfMonth = parseCronField(dayOfMonth, 1, 31);
    const months = parseCronField(month, 1, 12);
    const daysOfWeek = parseCronField(dayOfWeek, 0, 6);

    // Helper function to find next valid value
    const findNext = (current: number, values: number[]) => {
        const next = values.find((v) => v >= current);
        return next !== undefined ? next : values[0];
    };

    // Find next valid timestamp
    let found = false;
    while (!found) {
        // Check if current month is valid
        if (!months.includes(next.getMonth() + 1)) {
            next.setMonth(findNext(next.getMonth() + 1, months) - 1);
            next.setDate(1);
            next.setHours(0);
            next.setMinutes(0);
            continue;
        }

        // Check if current day is valid (both day of month and day of week)
        const currentDayOfWeek = next.getDay();
        const currentDayOfMonth = next.getDate();

        if (
            !daysOfMonth.includes(currentDayOfMonth) ||
            !daysOfWeek.includes(currentDayOfWeek)
        ) {
            next.setDate(next.getDate() + 1);
            next.setHours(0);
            next.setMinutes(0);
            continue;
        }

        // Check if current hour is valid
        if (!hours.includes(next.getHours())) {
            const nextHour = findNext(next.getHours(), hours);
            if (nextHour <= next.getHours()) {
                next.setDate(next.getDate() + 1);
                next.setHours(nextHour);
                next.setMinutes(0);
            } else {
                next.setHours(nextHour);
                next.setMinutes(0);
            }
            continue;
        }

        // Check if current minute is valid
        if (!minutes.includes(next.getMinutes())) {
            const nextMinute = findNext(next.getMinutes(), minutes);
            if (nextMinute <= next.getMinutes()) {
                next.setHours(next.getHours() + 1);
                next.setMinutes(nextMinute);
            } else {
                next.setMinutes(nextMinute);
            }
            continue;
        }

        // If we get here, we found a valid timestamp
        found = true;
    }

    return next;
}
