import { json } from "../../_lib/http.js";

export const onRequestGet = ({ data }) => json({ user: data.user });
