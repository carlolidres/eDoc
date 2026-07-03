export const CREATE_DOCUMENT = `
  mutation CreateDocument($object: documents_insert_input!) {
    insert_documents_one(object: $object) {
      id
      title
      status
      reference_number
    }
  }
`

export const CREATE_DOCUMENT_VERSION = `
  mutation CreateDocumentVersion($object: document_versions_insert_input!) {
    insert_document_versions_one(object: $object) {
      id
      version_number
      status
    }
  }
`

export const CREATE_DOCUMENT_ROUTE = `
  mutation CreateDocumentRoute($object: document_routes_insert_input!) {
    insert_document_routes_one(object: $object) {
      id
      route_steps {
        id
        sequence
        action
        route_step_assignees {
          id
          assignee_id
        }
      }
    }
  }
`

export const INSERT_SIGNATURE_FIELDS = `
  mutation InsertSignatureFields($objects: [signature_fields_insert_input!]!) {
    insert_signature_fields(objects: $objects) {
      affected_rows
    }
  }
`

export const UPDATE_DOCUMENT_STATUS = `
  mutation UpdateDocumentStatus($id: uuid!, $status: String!) {
    update_documents_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
      id
      status
    }
  }
`

export type CreateDocumentResponse = {
  insert_documents_one: {
    id: string
    title: string
    status: string
    reference_number: string | null
  } | null
}

export type CreateDocumentVersionResponse = {
  insert_document_versions_one: {
    id: string
    version_number: number
    status: string
  } | null
}

export type CreateDocumentRouteResponse = {
  insert_document_routes_one: {
    id: string
    route_steps: Array<{
      id: string
      sequence: number
      action: string
      route_step_assignees: Array<{
        id: string
        assignee_id: string
      }>
    }>
  } | null
}

export type InsertSignatureFieldsResponse = {
  insert_signature_fields: { affected_rows: number } | null
}

export type UpdateDocumentStatusResponse = {
  update_documents_by_pk: {
    id: string
    status: string
  } | null
}
