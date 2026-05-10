import {
  RoomsDocument,
  CreateRoomDocument,
  UpdateRoomDocument,
  DeleteRoomDocument,
  MessagesDocument,
  SendMessageDocument,
  EditMessageDocument,
  UsersDocument,
  UnreadCountsDocument,
  MarkReadDocument,
  InstanceDocument,
} from "../generated/graphql";

export {
  RoomsDocument as RoomsQuery,
  CreateRoomDocument as CreateRoomMutation,
  UpdateRoomDocument as UpdateRoomMutation,
  DeleteRoomDocument as DeleteRoomMutation,
  MessagesDocument as MessagesQuery,
  SendMessageDocument as SendMessageMutation,
  EditMessageDocument as EditMessageMutation,
  UsersDocument as UsersQuery,
  UnreadCountsDocument as UnreadCountsQuery,
  MarkReadDocument as MarkReadMutation,
  InstanceDocument as InstanceQuery,
};
