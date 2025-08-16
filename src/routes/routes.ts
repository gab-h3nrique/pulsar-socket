import path from "path";
import handler from "../utils/handler";
import failsController from "./failController";
import poolController from "./poolController";

export default function routes(app) {

        
    app.get('/fail', handler.error(failsController.get))
    app.post('/fail', handler.error(failsController.post))
    app.delete('/fail', handler.error(failsController.delete))

    app.get('/pool', handler.error(poolController.get))
    app.post('/pool', handler.error(poolController.post))
    app.delete('/pool', handler.error(poolController.delete))

}
